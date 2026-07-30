package site

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"
)

type inquiryStore struct {
	path string
	mu   sync.Mutex
}

type inquiryRecord struct {
	Kind     string         `json:"kind"`
	Received time.Time      `json:"received_at"`
	Inquiry  *storedInquiry `json:"inquiry,omitempty"`
	Email    string         `json:"email,omitempty"`
}

type storedInquiry struct {
	Name          string `json:"name"`
	Email         string `json:"email"`
	Telephone     string `json:"telephone,omitempty"`
	PreferredDate string `json:"preferred_date"`
	AlternateDate string `json:"alternate_date,omitempty"`
	GuestCount    string `json:"guest_count"`
	ServiceType   string `json:"service_type"`
	Location      string `json:"location"`
	Dietary       string `json:"dietary,omitempty"`
	Accessibility string `json:"accessibility,omitempty"`
	Occasion      string `json:"occasion,omitempty"`
	Message       string `json:"message,omitempty"`
}

func storeable(form ReservationForm) *storedInquiry {
	return &storedInquiry{
		Name: form.Name, Email: form.Email, Telephone: form.Telephone,
		PreferredDate: form.PreferredDate, AlternateDate: form.AlternateDate,
		GuestCount: form.GuestCount, ServiceType: form.ServiceType, Location: form.Location,
		Dietary: form.Dietary, Accessibility: form.Accessibility, Occasion: form.Occasion, Message: form.Message,
	}
}

func newInquiryStore() *inquiryStore {
	path := os.Getenv("ESKER_INQUIRY_FILE")
	if path == "" {
		path = filepath.Join("data", "inquiries.ndjson")
	}
	return &inquiryStore{path: path}
}

func (s *inquiryStore) append(record inquiryRecord) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if err := os.MkdirAll(filepath.Dir(s.path), 0o700); err != nil {
		return fmt.Errorf("create inquiry directory: %w", err)
	}
	file, err := os.OpenFile(s.path, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0o600)
	if err != nil {
		return fmt.Errorf("open inquiry store: %w", err)
	}
	defer file.Close()
	encoder := json.NewEncoder(file)
	encoder.SetEscapeHTML(true)
	if err := encoder.Encode(record); err != nil {
		return fmt.Errorf("write inquiry: %w", err)
	}
	return file.Sync()
}
