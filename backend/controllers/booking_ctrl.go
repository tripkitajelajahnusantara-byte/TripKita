package controllers

import (
	"crypto/subtle"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"

	"tripkita-provider/config"
	"tripkita-provider/models"
	"tripkita-provider/services"
)

type BookingController struct {
	service services.BookingService
	cfg     *config.Config
}

func NewBookingController(service services.BookingService, cfg *config.Config) *BookingController {
	return &BookingController{service: service, cfg: cfg}
}

func (ctrl *BookingController) GetAll(c *gin.Context) {
	providerID, exists := c.Get("provider_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	bookings, err := ctrl.service.GetAllBookings(providerID.(uint))
	if err != nil {
		respondInternalError(c, "memuat booking provider", err)
		return
	}

	c.JSON(http.StatusOK, bookings)
}

func (ctrl *BookingController) GetCustomerBookings(c *gin.Context) {
	customerID, exists := c.Get("provider_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	bookings, err := ctrl.service.GetCustomerBookings(customerID.(uint))
	if err != nil {
		respondInternalError(c, "memuat booking pelanggan", err)
		return
	}

	c.JSON(http.StatusOK, bookings)
}

func (ctrl *BookingController) GetPublicStatus(c *gin.Context) {
	code := c.Param("code")
	booking, err := ctrl.service.GetBookingByCode(code)
	if err != nil || booking == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Booking tidak ditemukan"})
		return
	}

	// Account bookings are visible only to their owner, provider, or admin.
	// Guest tracking receives a deliberately redacted view.
	if booking.CustomerID != nil && *booking.CustomerID > 0 {
		callerID, hasID := c.Get("provider_id")
		callerRole, _ := c.Get("role")
		if !hasID {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Otentikasi diperlukan untuk mengakses data pesanan ini"})
			return
		}
		id := callerID.(uint)
		if (callerRole == "CUSTOMER" && id != *booking.CustomerID) || (callerRole == "PROVIDER" && id != booking.ProviderID) || (callerRole != "CUSTOMER" && callerRole != "PROVIDER" && callerRole != "ADMIN") {
			c.JSON(http.StatusForbidden, gin.H{"error": "Anda tidak memiliki akses untuk melihat data pesanan ini"})
			return
		}
		c.JSON(http.StatusOK, booking)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"bookingCode":    booking.BookingCode,
		"status":         booking.Status,
		"tripDate":       booking.TripDate,
		"guests":         booking.Guests,
		"totalPrice":     booking.TotalPrice,
		"packageDetails": gin.H{"name": booking.Package.Name},
	})
}

func (ctrl *BookingController) UpdateStatus(c *gin.Context) {
	providerID, exists := c.Get("provider_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID format"})
		return
	}

	var req models.UpdateBookingStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	booking, err := ctrl.service.UpdateBookingStatus(uint(id), providerID.(uint), req.Status)
	if err != nil {
		respondInternalError(c, "memperbarui status booking", err)
		return
	}

	c.JSON(http.StatusOK, booking)
}

func (ctrl *BookingController) ProviderReschedule(c *gin.Context) {
	providerID, exists := c.Get("provider_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID format"})
		return
	}

	var req struct {
		NewTripDate string `json:"newTripDate" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Tanggal baru diperlukan"})
		return
	}

	booking, err := ctrl.service.ProviderReschedule(uint(id), providerID.(uint), req.NewTripDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, booking)
}

func (ctrl *BookingController) CreateBooking(c *gin.Context) {
	var req struct {
		PackageID       uint      `json:"packageId"`
		CustomerName    string    `json:"customerName" binding:"required,max=255"`
		CustomerEmail   string    `json:"customerEmail" binding:"required,email,max=255"`
		CustomerPhone   string    `json:"customerPhone" binding:"required,max=50"`
		CustomerInitial string    `json:"customerInitial"`
		Guests          int       `json:"guests" binding:"required,gt=0"`
		TripDate        time.Time `json:"tripDate" binding:"required"`
		AddOnIDs        []string  `json:"addOnIds" binding:"max=10,dive,max=50"`
		// Participants bersifat opsional agar klien lama tetap dapat checkout;
		// bila dikirim, jumlahnya divalidasi terhadap jumlah tamu di service.
		Participants []models.BookingParticipantInput `json:"participants" binding:"max=100,dive"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.PackageID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "packageId wajib diisi"})
		return
	}

	booking := &models.Booking{
		PackageID:        req.PackageID,
		CustomerName:     req.CustomerName,
		CustomerEmail:    req.CustomerEmail,
		CustomerPhone:    req.CustomerPhone,
		CustomerInitial:  req.CustomerInitial,
		Guests:           req.Guests,
		TripDate:         req.TripDate,
		PaymentMethod:    "Xendit Invoice",
		SelectedAddOnIDs: req.AddOnIDs,
	}
	for _, p := range req.Participants {
		booking.Participants = append(booking.Participants, models.BookingParticipant{
			Name:         p.Name,
			Phone:        p.Phone,
			Gender:       p.Gender,
			BirthDate:    p.BirthDate,
			MedicalNotes: p.MedicalNotes,
		})
	}
	if role, _ := c.Get("role"); role == "CUSTOMER" {
		if customerID, exists := c.Get("provider_id"); exists {
			id := customerID.(uint)
			booking.CustomerID = &id
		}
	}

	if booking.CustomerInitial == "" && len(booking.CustomerName) > 0 {
		booking.CustomerInitial = string(booking.CustomerName[0])
	}

	if err := ctrl.service.CreateBooking(booking); err != nil {
		var inputErr *services.BookingInputError
		if errors.As(err, &inputErr) {
			c.JSON(http.StatusBadRequest, gin.H{"error": inputErr.Error()})
			return
		}
		var gatewayErr *services.BookingGatewayError
		if errors.As(err, &gatewayErr) {
			c.JSON(http.StatusBadGateway, gin.H{"error": gatewayErr.Error()})
			return
		}
		log.Printf("gagal membuat booking: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Booking belum dapat dibuat"})
		return
	}

	c.JSON(http.StatusCreated, booking)
}

// GetCheckoutConfig memberi web dan aplikasi mobile angka checkout yang sama
// dengan perhitungan backend, agar ringkasan pembayaran tidak menebak sendiri.
func (ctrl *BookingController) GetCheckoutConfig(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"serviceFee":           models.BookingServiceFee,
		"paymentWindowSeconds": int(models.PaymentWindow.Seconds()),
	})
}

func (ctrl *BookingController) CustomerCancelBooking(c *gin.Context) {
	customerID, exists := c.Get("provider_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID format"})
		return
	}
	booking, err := ctrl.service.CancelBookingByCustomer(uint(id), customerID.(uint))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, booking)
}

func (ctrl *BookingController) RenderMockCheckout(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.String(http.StatusBadRequest, "Invalid ID format")
		return
	}

	// Fetch booking
	booking, err := ctrl.service.GetBookingByID(uint(id))
	if err != nil || booking == nil {
		booking = &models.Booking{
			ID:              uint(id),
			BookingCode:     fmt.Sprintf("TT-MOCK-%d", id),
			CustomerName:    "Pelanggan TemenTrip",
			Guests:          2,
			TotalPrice:      1500000,
			TripDate:        time.Now().AddDate(0, 0, 7),
			XenditInvoiceID: fmt.Sprintf("xendit_inv_%d", id),
			Package:         models.Package{Name: "Paket Wisata TemenTrip"},
		}
	}
	if booking.Package.Name == "" {
		booking.Package.Name = "Paket Wisata TemenTrip"
	}

	// Render a very premium Stripe/Xendit-like HTML checkout page
	htmlContent := fmt.Sprintf(`
	<!DOCTYPE html>
	<html lang="id">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<title>TemenTrip Invoice - Xendit Payment Simulator</title>
		<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
		<style>
			:root {
				--bg-color: #f8fafc;
				--card-bg: #ffffff;
				--text-primary: #0f172a;
				--text-secondary: #475569;
				--accent-color: #0f172a;
				--accent-hover: #1e293b;
				--success-color: #10b981;
				--danger-color: #ef4444;
				--border-color: #e2e8f0;
			}
			body {
				font-family: 'Plus Jakarta Sans', sans-serif;
				background-color: var(--bg-color);
				color: var(--text-primary);
				margin: 0;
				padding: 40px 20px;
				display: flex;
				justify-content: center;
				align-items: center;
				min-height: 100vh;
				box-sizing: border-box;
			}
			.checkout-card {
				background-color: var(--card-bg);
				border-radius: 20px;
				box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
				width: 100%%;
				max-width: 540px;
				padding: 40px;
				border: 1px solid var(--border-color);
			}
			.header {
				text-align: center;
				margin-bottom: 30px;
			}
			.logo {
				font-size: 24px;
				font-weight: 800;
				color: #0d9488;
				letter-spacing: -0.5px;
				margin-bottom: 8px;
			}
			.logo span {
				color: #f59e0b;
			}
			.invoice-title {
				font-size: 14px;
				color: var(--text-secondary);
				text-transform: uppercase;
				letter-spacing: 1px;
				font-weight: 600;
			}
			.amount-display {
				text-align: center;
				font-size: 36px;
				font-weight: 800;
				margin: 20px 0;
				color: var(--text-primary);
			}
			.details-section {
				border-top: 1px solid var(--border-color);
				border-bottom: 1px solid var(--border-color);
				padding: 20px 0;
				margin-bottom: 30px;
			}
			.detail-row {
				display: flex;
				justify-content: space-between;
				margin-bottom: 12px;
				font-size: 14px;
			}
			.detail-row:last-child {
				margin-bottom: 0;
			}
			.detail-label {
				color: var(--text-secondary);
			}
			.detail-value {
				font-weight: 600;
				color: var(--text-primary);
			}
			.payment-methods-title {
				font-size: 14px;
				font-weight: 700;
				margin-bottom: 15px;
				color: var(--text-secondary);
			}
			.payment-grid {
				display: grid;
				grid-template-columns: 1fr 1fr;
				gap: 12px;
				margin-bottom: 30px;
			}
			.payment-method {
				border: 1px solid var(--border-color);
				border-radius: 12px;
				padding: 14px;
				display: flex;
				align-items: center;
				gap: 10px;
				cursor: pointer;
				transition: all 0.2s ease;
				font-size: 13px;
				font-weight: 600;
			}
			.payment-method:hover {
				border-color: #0d9488;
				background-color: #f0fdfa;
			}
			.payment-method.active {
				border-color: #0d9488;
				background-color: #f0fdfa;
				box-shadow: 0 0 0 2px rgba(13, 148, 136, 0.2);
			}
			.payment-icon {
				width: 24px;
				height: 24px;
				display: flex;
				align-items: center;
				justify-content: center;
				font-size: 12px;
				font-weight: 700;
				color: #0d9488;
				background: #ccfbf1;
				border-radius: 6px;
			}
			.action-buttons {
				display: flex;
				flex-direction: column;
				gap: 12px;
			}
			.btn {
				font-family: inherit;
				font-size: 15px;
				font-weight: 700;
				padding: 14px;
				border-radius: 12px;
				border: none;
				cursor: pointer;
				transition: all 0.2s ease;
				text-align: center;
			}
			.btn-primary {
				background-color: #0d9488;
				color: white;
			}
			.btn-primary:hover {
				background-color: #0f766e;
				transform: translateY(-1px);
			}
			.btn-secondary {
				background-color: #fee2e2;
				color: var(--danger-color);
				border: 1px solid #fecaca;
			}
			.btn-secondary:hover {
				background-color: #fecaca;
				transform: translateY(-1px);
			}
			.footer {
				text-align: center;
				font-size: 12px;
				color: var(--text-secondary);
				margin-top: 25px;
			}
		</style>
	</head>
	<body>
		<div class="checkout-card">
			<div class="header">
				<div class="logo">Trip<span>Kita</span></div>
				<div class="invoice-title">Xendit Payment Simulator</div>
			</div>
			
			<div class="amount-display">Rp %d</div>
			
			<div class="details-section">
				<div class="detail-row">
					<span class="detail-label">Kode Booking</span>
					<span class="detail-value">%s</span>
				</div>
				<div class="detail-row">
					<span class="detail-label">Paket Wisata</span>
					<span class="detail-value">%s</span>
				</div>
				<div class="detail-row">
					<span class="detail-label">Nama Pelanggan</span>
					<span class="detail-value">%s</span>
				</div>
				<div class="detail-row">
					<span class="detail-label">Jumlah Peserta</span>
					<span class="detail-value">%d orang</span>
				</div>
				<div class="detail-row">
					<span class="detail-label">Tanggal Perjalanan</span>
					<span class="detail-value">%s</span>
				</div>
			</div>

			<div class="payment-methods-title">Pilih Metode Pembayaran</div>
			<div class="payment-grid">
				<div class="payment-method active" onclick="selectMethod(this, 'QRIS')">
					<div class="payment-icon">QR</div>
					<span>QRIS</span>
				</div>
				<div class="payment-method" onclick="selectMethod(this, 'BCA VA')">
					<div class="payment-icon">VA</div>
					<span>BCA Virtual Account</span>
				</div>
				<div class="payment-method" onclick="selectMethod(this, 'Mandiri VA')">
					<div class="payment-icon">VA</div>
					<span>Mandiri Virtual Account</span>
				</div>
				<div class="payment-method" onclick="selectMethod(this, 'E-Wallet')">
					<div class="payment-icon">EW</div>
					<span>E-Wallet (OVO/Dana)</span>
				</div>
			</div>

			<form id="payment-form" action="/api/v1/public/xendit-mock-checkout/%d/pay" method="POST">
				<input type="hidden" name="status" id="payment-status" value="PAID">
				<input type="hidden" name="payment_method" id="selected-method" value="QRIS">
				
				<div class="action-buttons">
					<button type="submit" class="btn btn-primary" onclick="setStatus('PAID')">
						Simulasikan Pembayaran Sukses
					</button>
					<button type="submit" class="btn btn-secondary" onclick="setStatus('FAILED')">
						Simulasikan Pembayaran Gagal / Expired
					</button>
				</div>
			</form>

			<div class="footer">
				Mock Invoice ID: %s &bull; Powered by Xendit Simulator
			</div>
		</div>

		<script>
			function selectMethod(el, method) {
				document.querySelectorAll('.payment-method').forEach(m => m.classList.remove('active'));
				el.classList.add('active');
				document.getElementById('selected-method').value = method;
			}
			function setStatus(status) {
				document.getElementById('payment-status').value = status;
			}
		</script>
	</body>
	</html>
	`, booking.TotalPrice, booking.BookingCode, booking.Package.Name, booking.CustomerName, booking.Guests, booking.TripDate.Format("02 Jan 2006"), booking.ID, booking.XenditInvoiceID)

	c.Data(http.StatusOK, "text/html; charset=utf-8", []byte(htmlContent))
}

func (ctrl *BookingController) ProcessMockPayment(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID format"})
		return
	}

	status := c.PostForm("status")
	paymentMethod := c.PostForm("payment_method")
	if paymentMethod == "" {
		paymentMethod = "QRIS"
	}

	booking, err := ctrl.service.GetBookingByID(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Booking not found"})
		return
	}

	err = ctrl.service.UpdateStatusByWebhook(booking.XenditInvoiceID, fmt.Sprintf("booking_%d_mock", booking.ID), status, paymentMethod, booking.TotalPrice, "IDR")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	redirectURL := ctrl.cfg.FrontendURL
	if redirectURL == "" {
		redirectURL = "https://trip-kita.vercel.app"
	}
	c.Redirect(http.StatusFound, redirectURL)
}

func (ctrl *BookingController) XenditWebhook(c *gin.Context) {
	if ctrl.cfg.XenditWebhookToken == "" {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Webhook belum dikonfigurasi"})
		return
	}
	callbackToken := c.GetHeader("x-callback-token")
	if len(callbackToken) != len(ctrl.cfg.XenditWebhookToken) || subtle.ConstantTimeCompare([]byte(callbackToken), []byte(ctrl.cfg.XenditWebhookToken)) != 1 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: Invalid Xendit callback token"})
		return
	}

	var req struct {
		ID             string `json:"id" binding:"required,max=255"`
		ExternalID     string `json:"external_id" binding:"max=255"`
		Status         string `json:"status" binding:"required,max=50"`
		PaymentMethod  string `json:"payment_method" binding:"max=100"`
		PaymentChannel string `json:"payment_channel" binding:"max=100"`
		Amount         int64  `json:"amount" binding:"gte=0"`
		Currency       string `json:"currency" binding:"max=10"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	payMethod := req.PaymentMethod
	if payMethod == "" && req.PaymentChannel != "" {
		payMethod = req.PaymentChannel
	}
	if payMethod == "" {
		payMethod = "Xendit Payment"
	}

	err := ctrl.service.UpdateStatusByWebhook(req.ID, req.ExternalID, req.Status, payMethod, req.Amount, req.Currency)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Webhook belum dapat diproses"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

func (ctrl *BookingController) GetRefunds(c *gin.Context) {
	refunds, err := ctrl.service.GetRefunds()
	if err != nil {
		respondInternalError(c, "memuat daftar refund", err)
		return
	}

	bookingIDs := make([]uint, 0, len(refunds))
	for _, refund := range refunds {
		bookingIDs = append(bookingIDs, refund.ID)
	}
	records, err := ctrl.service.GetRefundRecords(bookingIDs)
	if err != nil {
		respondInternalError(c, "memuat catatan refund", err)
		return
	}

	// Catatan audit disertakan agar admin melihat nominal, metode, referensi, dan
	// pemroses tiap refund, bukan sekadar status booking.
	response := make([]gin.H, 0, len(refunds))
	for _, refund := range refunds {
		item := gin.H{"booking": refund}
		if record, ok := records[refund.ID]; ok {
			item["refundRecord"] = record
		}
		response = append(response, item)
	}
	c.JSON(http.StatusOK, response)
}

func (ctrl *BookingController) CompleteRefund(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID format"})
		return
	}

	var req models.CompleteRefundRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Nominal, metode, dan nomor referensi transfer wajib diisi"})
		return
	}

	// Identitas admin diambil dari token, tidak pernah dari badan permintaan,
	// supaya catatan audit tidak dapat diatasnamakan orang lain.
	adminID, exists := c.Get("provider_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi admin tidak valid"})
		return
	}

	record, err := ctrl.service.CompleteRefund(uint(id), adminID.(uint), &req)
	if err != nil {
		var inputErr *services.BookingInputError
		if errors.As(err, &inputErr) {
			c.JSON(http.StatusBadRequest, gin.H{"error": inputErr.Message})
			return
		}
		respondInternalError(c, "menyelesaikan refund", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "message": "Refund completed", "record": record})
}

func (ctrl *BookingController) AdminListBookings(c *gin.Context) {
	bookings, err := ctrl.service.AdminGetAllBookings()
	if err != nil {
		respondInternalError(c, "memuat booking admin", err)
		return
	}
	c.JSON(http.StatusOK, bookings)
}
