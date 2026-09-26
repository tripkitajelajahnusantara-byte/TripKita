package services

import (
	"errors"
	"fmt"
	"log"
	"strings"
	"time"

	"tripkita-provider/models"
	"tripkita-provider/repositories"
)

const maxTripPlansPerCustomer = 10

var automaticTripChecklist = []models.TripChecklistItem{
	{ID: "1", Label: "Tentukan Destinasi & Target Budget Liburan", Completed: true},
	{ID: "2", Label: "Capai 25% Tabungan Perjalanan"},
	{ID: "3", Label: "Capai 50% Tabungan Perjalanan"},
	{ID: "4", Label: "Capai 75% Tabungan Perjalanan"},
	{ID: "5", Label: "Capai 100% Target Tabungan"},
}

type TripPlanService interface {
	List(customerID uint) ([]models.TripPlan, error)
	Create(customerID uint, req *models.SaveTripPlanRequest) (*models.TripPlan, error)
	Update(customerID, planID uint, req *models.SaveTripPlanRequest) (*models.TripPlan, error)
	Delete(customerID, planID uint) error
}

type tripPlanService struct {
	repo         repositories.TripPlanRepository
	providerRepo repositories.ProviderRepository
	notifService *NotificationService
	emailService *EmailService
}

func NewTripPlanService(repo repositories.TripPlanRepository, providerRepo repositories.ProviderRepository, notif *NotificationService, email *EmailService) TripPlanService {
	return &tripPlanService{repo: repo, providerRepo: providerRepo, notifService: notif, emailService: email}
}

func (s *tripPlanService) List(customerID uint) ([]models.TripPlan, error) {
	plans, err := s.repo.ListByCustomer(customerID)
	if err != nil {
		return nil, err
	}
	for i := range plans {
		prepareTripPlan(&plans[i])
	}
	return plans, nil
}

func (s *tripPlanService) Create(customerID uint, req *models.SaveTripPlanRequest) (*models.TripPlan, error) {
	count, err := s.repo.CountByCustomer(customerID)
	if err != nil {
		return nil, err
	}
	if count >= maxTripPlansPerCustomer {
		return nil, errors.New("batas maksimal 10 rencana trip telah tercapai")
	}

	plan := &models.TripPlan{CustomerID: customerID}
	if err := applyTripPlanRequest(plan, req, true); err != nil {
		return nil, err
	}
	if err := s.repo.Create(plan); err != nil {
		return nil, err
	}
	prepareTripPlan(plan)
	s.notify(customerID, plan, "Rencana Trip Dibuat", fmt.Sprintf("Rencana perjalanan ke %s untuk %d peserta berhasil dibuat.", plan.Destination, plan.Participants))
	return plan, nil
}

func (s *tripPlanService) Update(customerID, planID uint, req *models.SaveTripPlanRequest) (*models.TripPlan, error) {
	plan, err := s.repo.FindOwned(planID, customerID)
	if err != nil {
		return nil, err
	}
	previousSaved := tripSavedAmount(plan.SavingsLogs)
	previousBudget := plan.TargetBudget
	if err := applyTripPlanRequest(plan, req, false); err != nil {
		return nil, err
	}
	if err := s.repo.Update(plan); err != nil {
		return nil, err
	}
	prepareTripPlan(plan)

	title := "Rencana Trip Diperbarui"
	message := fmt.Sprintf("Perubahan rencana perjalanan ke %s berhasil disimpan.", plan.Destination)
	if milestone := crossedTripMilestone(previousSaved, previousBudget, plan.SavedAmount, plan.TargetBudget); milestone > 0 {
		title = fmt.Sprintf("Target Tabungan %d%% Tercapai", milestone)
		message = fmt.Sprintf("Selamat! Tabungan rencana trip ke %s sudah mencapai %d%% dari target.", plan.Destination, milestone)
	}
	s.notify(customerID, plan, title, message)
	return plan, nil
}

func (s *tripPlanService) Delete(customerID, planID uint) error {
	plan, err := s.repo.FindOwned(planID, customerID)
	if err != nil {
		return err
	}
	if err := s.repo.DeleteOwned(planID, customerID); err != nil {
		return err
	}
	prepareTripPlan(plan)
	s.notify(customerID, plan, "Rencana Trip Dihapus", fmt.Sprintf("Rencana perjalanan ke %s telah dihapus sesuai permintaan Anda.", plan.Destination))
	return nil
}

func (s *tripPlanService) notify(customerID uint, plan *models.TripPlan, title, message string) {
	if s.notifService != nil {
		if err := s.notifService.CreateNotification(customerID, "CUSTOMER", title, message, NotifTypeTripPlan, "/rencana-trip"); err != nil {
			log.Printf("[Rencana Trip] gagal membuat notifikasi customer %d: %v", customerID, err)
		}
	}
	if s.emailService == nil {
		return
	}
	customer, err := s.providerRepo.FindByID(customerID)
	if err != nil {
		log.Printf("[Rencana Trip] customer %d tidak ditemukan untuk email: %v", customerID, err)
		return
	}
	if err := s.emailService.SendTripPlanEventEmail(customer, plan, title, message); err != nil {
		log.Printf("[Rencana Trip] gagal mengirim email customer %d: %v", customerID, err)
	}
}

func applyTripPlanRequest(plan *models.TripPlan, req *models.SaveTripPlanRequest, creating bool) error {
	destination := strings.TrimSpace(req.Destination)
	if destination == "" || len([]rune(destination)) > 120 {
		return errors.New("destinasi wajib diisi dan maksimal 120 karakter")
	}
	target, err := time.Parse("2006-01-02", req.TargetMonth)
	if err != nil {
		return errors.New("tanggal keberangkatan tidak valid")
	}
	nowWIB := time.Now().In(time.FixedZone("WIB", 7*60*60))
	today := time.Date(nowWIB.Year(), nowWIB.Month(), nowWIB.Day(), 0, 0, 0, 0, time.UTC)
	if target.Before(today) && (creating || req.TargetMonth != plan.TargetMonth) {
		return errors.New("tanggal keberangkatan tidak boleh di masa lalu")
	}
	if target.After(today.AddDate(5, 0, 0)) && (creating || req.TargetMonth != plan.TargetMonth) {
		return errors.New("tanggal keberangkatan maksimal 5 tahun dari sekarang")
	}
	if req.Participants < 1 || req.Participants > 100 {
		return errors.New("jumlah peserta harus antara 1 dan 100 orang")
	}
	if req.TargetBudget < 1 || req.TargetBudget > 1_000_000_000_000 {
		return errors.New("target budget tidak valid")
	}
	if len(req.SavingsLogs) > 500 {
		return errors.New("catatan tabungan maksimal 500 item")
	}

	logs := make([]models.TripSavingsLog, 0, len(req.SavingsLogs))
	seenLogs := make(map[string]bool)
	for _, item := range req.SavingsLogs {
		item.ID = strings.TrimSpace(item.ID)
		item.Note = strings.TrimSpace(item.Note)
		if item.ID == "" || seenLogs[item.ID] || item.Amount <= 0 || item.Amount > 1_000_000_000_000 {
			return errors.New("catatan tabungan berisi data yang tidak valid")
		}
		if _, err := time.Parse("2006-01-02", item.Date); err != nil {
			return errors.New("tanggal catatan tabungan tidak valid")
		}
		seenLogs[item.ID] = true
		logs = append(logs, item)
	}

	checklist, err := normalizeTripChecklist(req.Checklist)
	if err != nil {
		return err
	}
	if creating && len(req.Checklist) == 0 {
		checklist = append(checklist,
			models.TripChecklistItem{ID: "6", Label: "Cari & Pesan Paket Open Trip di TemenTrip"},
			models.TripChecklistItem{ID: "7", Label: "Siapkan Barang Bawaan & Pakaian Liburan"},
			models.TripChecklistItem{ID: "8", Label: "Siap Berangkat & Nikmati Liburan! 🥳"},
		)
	}

	plan.Destination = destination
	plan.TargetMonth = req.TargetMonth
	plan.Participants = req.Participants
	plan.TargetBudget = req.TargetBudget
	plan.Checklist = checklist
	plan.SavingsLogs = logs
	plan.Status = req.Status
	if plan.Status == "" {
		plan.Status = "SAVED"
	}
	applyAutomaticChecklist(plan)
	return nil
}

func normalizeTripChecklist(input []models.TripChecklistItem) ([]models.TripChecklistItem, error) {
	result := append([]models.TripChecklistItem(nil), automaticTripChecklist...)
	seen := map[string]bool{"1": true, "2": true, "3": true, "4": true, "5": true}
	for _, item := range input {
		item.ID = strings.TrimSpace(item.ID)
		item.Label = strings.TrimSpace(item.Label)
		if seen[item.ID] {
			continue
		}
		if item.ID == "" || item.Label == "" || len([]rune(item.Label)) > 160 {
			return nil, errors.New("checklist berisi data yang tidak valid")
		}
		if len(result) >= 50 {
			return nil, errors.New("checklist maksimal 50 item")
		}
		seen[item.ID] = true
		result = append(result, item)
	}
	return result, nil
}

func prepareTripPlan(plan *models.TripPlan) {
	plan.SavedAmount = tripSavedAmount(plan.SavingsLogs)
	if target, err := time.Parse("2006-01-02", plan.TargetMonth); err == nil {
		months := [...]string{"Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"}
		plan.TargetMonthLabel = fmt.Sprintf("%d %s %d", target.Day(), months[target.Month()-1], target.Year())
	}
	applyAutomaticChecklist(plan)
}

func applyAutomaticChecklist(plan *models.TripPlan) {
	saved := tripSavedAmount(plan.SavingsLogs)
	for i := range plan.Checklist {
		switch plan.Checklist[i].ID {
		case "1":
			plan.Checklist[i].Completed = true
		case "2":
			plan.Checklist[i].Completed = saved*100 >= plan.TargetBudget*25
		case "3":
			plan.Checklist[i].Completed = saved*100 >= plan.TargetBudget*50
		case "4":
			plan.Checklist[i].Completed = saved*100 >= plan.TargetBudget*75
		case "5":
			plan.Checklist[i].Completed = saved >= plan.TargetBudget
		}
	}
}

func tripSavedAmount(logs []models.TripSavingsLog) int64 {
	var total int64
	for _, item := range logs {
		total += item.Amount
	}
	return total
}

func crossedTripMilestone(oldSaved, oldBudget, newSaved, newBudget int64) int {
	if oldBudget <= 0 || newBudget <= 0 {
		return 0
	}
	for _, level := range []int64{100, 75, 50, 25} {
		if oldSaved*100 < oldBudget*level && newSaved*100 >= newBudget*level {
			return int(level)
		}
	}
	return 0
}
