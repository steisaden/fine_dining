package site

import (
	"net/http"
	"net/mail"
	"strconv"
	"strings"
	"time"
)

type ReservationForm struct {
	Name, Email, Telephone, PreferredDate, AlternateDate string
	GuestCount, ServiceType, Location                    string
	Dietary, Accessibility, Occasion, Message, Consent   string
	Website, StartedAt                                   string
}

func parseReservation(r *http.Request) ReservationForm {
	_ = r.ParseForm()
	return ReservationForm{
		Name: strings.TrimSpace(r.FormValue("name")), Email: strings.TrimSpace(r.FormValue("email")),
		Telephone: strings.TrimSpace(r.FormValue("telephone")), PreferredDate: r.FormValue("preferred_date"),
		AlternateDate: r.FormValue("alternate_date"), GuestCount: r.FormValue("guest_count"),
		ServiceType: r.FormValue("service_type"), Location: strings.TrimSpace(r.FormValue("location")),
		Dietary: strings.TrimSpace(r.FormValue("dietary")), Accessibility: strings.TrimSpace(r.FormValue("accessibility")),
		Occasion: strings.TrimSpace(r.FormValue("occasion")), Message: strings.TrimSpace(r.FormValue("message")),
		Consent: r.FormValue("consent"), Website: r.FormValue("website"), StartedAt: r.FormValue("started_at"),
	}
}

func (f ReservationForm) validate() (map[string]string, []string) {
	errs := map[string]string{}
	if f.Name == "" {
		errs["name"] = "Enter your name."
	} else if len([]rune(f.Name)) > 120 {
		errs["name"] = "Keep your name to 120 characters or fewer."
	}
	if address, err := mail.ParseAddress(f.Email); err != nil || address.Address != f.Email {
		errs["email"] = "Enter a valid email address."
	}
	if _, err := time.Parse("2006-01-02", f.PreferredDate); err != nil {
		errs["preferred_date"] = "Choose a preferred date."
	}
	if f.AlternateDate != "" {
		if _, err := time.Parse("2006-01-02", f.AlternateDate); err != nil {
			errs["alternate_date"] = "Choose a valid alternate date or leave it blank."
		}
	}
	n, err := strconv.Atoi(f.GuestCount)
	if err != nil || n < 1 || n > 24 {
		errs["guest_count"] = "Enter a guest count from 1 to 24."
	}
	validService := map[string]bool{"tasting": true, "private": true, "chef-table": true, "celebration": true, "collaboration": true}
	if !validService[f.ServiceType] {
		errs["service_type"] = "Choose a service type."
	}
	if f.Location == "" {
		errs["location"] = "Tell us where the dinner would take place."
	}
	if f.Consent == "" {
		errs["consent"] = "Acknowledge that this is an availability inquiry."
	}
	if f.Website != "" {
		errs["form"] = "We could not process this request."
	}
	stamp, stampErr := strconv.ParseInt(f.StartedAt, 10, 64)
	if stampErr != nil || stamp > time.Now().Unix()+60 || time.Now().Unix()-stamp > 24*60*60 {
		errs["form"] = "This form has expired. Refresh the page and try again."
	} else if time.Now().Unix()-stamp < 2 {
		errs["form"] = "Please take a moment to review your request before sending."
	}
	order := []string{"form", "name", "email", "preferred_date", "alternate_date", "guest_count", "service_type", "location", "consent"}
	var summary []string
	for _, key := range order {
		if message := errs[key]; message != "" {
			summary = append(summary, message)
		}
	}
	return errs, summary
}
