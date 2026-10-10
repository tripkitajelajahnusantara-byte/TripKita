package repositories

import (
	"errors"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	"tripkita-provider/models"
)

func mockRepositoryDB(t *testing.T) (*gorm.DB, sqlmock.Sqlmock) {
	t.Helper()
	conn, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { conn.Close() })
	db, err := gorm.Open(postgres.New(postgres.Config{Conn: conn}), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	if err != nil {
		t.Fatal(err)
	}
	return db, mock
}

func TestDisabledOwnerCannotCreateOrRepublishPackage(t *testing.T) {
	for _, operation := range []string{"create", "update"} {
		for _, status := range []string{"DISABLED", "REJECTED", "PENDING", "APPROVED"} {
			t.Run(operation+status, func(t *testing.T) {
				db, mock := mockRepositoryDB(t)
				mock.ExpectBegin()
				mock.ExpectQuery(`SELECT .* FROM "providers".*FOR UPDATE`).WillReturnRows(sqlmock.NewRows([]string{"id", "role", "status", "is_verified", "deleted_at"}).AddRow(7, "PROVIDER", status, true, time.Now()))
				// No INSERT/UPDATE is allowed, including for an inconsistent legacy status.
				mock.ExpectRollback()
				pkg := &models.Package{ID: 3, ProviderID: 7, Status: "Aktif"}
				repo := NewPackageRepository(db)
				var err error
				if operation == "create" {
					err = repo.Create(pkg)
				} else {
					err = repo.Update(pkg)
				}
				if err == nil {
					t.Fatal("inactive provider was allowed to publish")
				}
				if err := mock.ExpectationsWereMet(); err != nil {
					t.Fatal(err)
				}
			})
		}
	}
}

func TestDisableIsAtomicAndRetainsAuditData(t *testing.T) {
	for _, failPackages := range []bool{false, true} {
		t.Run(map[bool]string{false: "success", true: "rollback"}[failPackages], func(t *testing.T) {
			db, mock := mockRepositoryDB(t)
			mock.ExpectBegin()
			mock.ExpectQuery(`SELECT .* FROM "providers".*FOR UPDATE`).WillReturnRows(sqlmock.NewRows([]string{"id", "role", "status"}).AddRow(7, "PROVIDER", "APPROVED"))
			mock.ExpectExec(`UPDATE "providers" SET`).WithArgs(sqlmock.AnyArg(), false, "DISABLED", sqlmock.AnyArg(), "Akun dinonaktifkan oleh administrator", 7, "PROVIDER").WillReturnResult(sqlmock.NewResult(0, 1))
			mock.ExpectQuery(`SELECT .* FROM "users"`).WillReturnRows(sqlmock.NewRows([]string{"id", "provider_id"}).AddRow(9, 7))
			mock.ExpectExec(`UPDATE "auth_sessions" SET "revoked_at"`).WillReturnResult(sqlmock.NewResult(0, 2))
			update := mock.ExpectExec(`UPDATE "packages" SET`).WithArgs("Nonaktif", sqlmock.AnyArg(), 7)
			if failPackages {
				update.WillReturnError(errors.New("database unavailable"))
				mock.ExpectRollback()
			} else {
				update.WillReturnResult(sqlmock.NewResult(0, 3))
				mock.ExpectQuery(`INSERT INTO "provider_status_histories"`).WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(1))
				mock.ExpectCommit()
			}
			err := NewProviderRepository(db).Delete(7)
			if (err != nil) != failPackages {
				t.Fatalf("unexpected result: %v", err)
			}
			if err := mock.ExpectationsWereMet(); err != nil {
				t.Fatal(err)
			}
		})
	}
}

func TestPublicPackagesExcludeSoftDeletedProviders(t *testing.T) {
	db, mock := mockRepositoryDB(t)
	mock.ExpectQuery(`SELECT .*JOIN providers.*providers.deleted_at IS NULL`).WillReturnRows(sqlmock.NewRows([]string{"id"}))
	if _, err := NewPackageRepository(db).FindAllPublic(); err != nil {
		t.Fatal(err)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatal(err)
	}
}
