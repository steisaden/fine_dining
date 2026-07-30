package site

import (
	"bytes"
	"fmt"
	"html/template"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

type App struct {
	templates *template.Template
	store     *inquiryStore
}

func New() (*App, error) {
	t, err := parseTemplates()
	if err != nil {
		return nil, err
	}
	return &App{templates: t, store: newInquiryStore()}, nil
}

var pageInfo = map[string]struct{ title, description, page, tmpl string }{
	"/":               {"Esker — The Final Millimeter", "Seasonal tasting and private dining, composed at the last precise moment.", "home", "home-content"},
	"/menu":           {"The Menu — Esker", "A seasonal course index, shaped by availability and the table.", "menu", "menu-content"},
	"/private-dining": {"Private Dining — Esker", "Intimate chef-led dinners, celebrations, and collaborations.", "private-dining", "private-content"},
	"/journal":        {"Journal — Esker", "Working notes on ingredients, restraint, and service.", "journal", "journal-content"},
	"/reservations":   {"Reservations — Esker", "Send an availability inquiry for a tasting or private table.", "reservations", "reservations-content"},
	"/prompt/":        {"Implementation Archive — Esker", "The complete design and implementation record for Esker.", "prompt", "prompt-content"},
}

func (a *App) page(w http.ResponseWriter, r *http.Request) {
	info, ok := pageInfo[r.URL.Path]
	if !ok {
		http.NotFound(w, r)
		return
	}
	data := pageData(info, r.URL.Query().Get("course"), r.URL.Query().Get("service"))
	if info.page == "prompt" {
		raw, _ := os.ReadFile("prompt/reconstruction-prompt.md")
		data.PromptText = string(raw)
	}
	a.render(w, "base", data)
}

func pageData(info struct{ title, description, page, tmpl string }, courseSlug, serviceSlug string) PageData {
	return PageData{
		Title: info.title, Description: info.description, Page: info.page,
		ContentTemplate: info.tmpl, Nav: nav(info.page), Courses: courses, Services: services,
		SelectedCourse: courseBySlug(courseSlug), SelectedService: serviceBySlug(serviceSlug),
	}
}

func nav(current string) []NavItem {
	items := []NavItem{{"Menu", "/menu", false}, {"Private Dining", "/private-dining", false}, {"Journal", "/journal", false}, {"Reservations", "/reservations", false}}
	for i := range items {
		items[i].Current = strings.TrimPrefix(items[i].URL, "/") == current
	}
	return items
}

func (a *App) menuCourse(w http.ResponseWriter, r *http.Request) {
	for _, c := range courses {
		if c.Slug == r.PathValue("course") {
			a.render(w, "menu-course", c)
			return
		}
	}
	http.NotFound(w, r)
}

func (a *App) privateService(w http.ResponseWriter, r *http.Request) {
	for _, s := range services {
		if s.Slug == r.PathValue("service") {
			a.render(w, "private-service", s)
			return
		}
	}
	http.NotFound(w, r)
}

func (a *App) reservationForm(w http.ResponseWriter, r *http.Request) {
	a.render(w, "reservation-form", PageData{Form: ReservationForm{}})
}

func (a *App) submitReservation(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 64<<10)
	form := parseReservation(r)
	errs, summary := form.validate()
	data := PageData{Form: form, Errors: errs, ErrorSummary: summary}
	isHTMX := r.Header.Get("HX-Request") == "true"
	if len(errs) > 0 {
		if isHTMX {
			a.render(w, "reservation-form", data)
		} else {
			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			w.WriteHeader(http.StatusUnprocessableEntity)
			data.Title, data.Description, data.Page, data.ContentTemplate, data.Nav = "Reservations — Esker", "Correct the marked fields and resend your inquiry.", "reservations", "reservations-content", nav("reservations")
			a.render(w, "base", data)
		}
		return
	}
	if err := a.store.append(inquiryRecord{Kind: "reservation", Received: time.Now().UTC(), Inquiry: storeable(form)}); err != nil {
		data.Errors = map[string]string{"form": "We could not save your request. Your entries are still here; please try again."}
		data.ErrorSummary = []string{data.Errors["form"]}
		if isHTMX {
			a.render(w, "reservation-form", data)
		} else {
			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			w.WriteHeader(http.StatusServiceUnavailable)
			data.Title, data.Description, data.Page, data.ContentTemplate, data.Nav = "Request not saved — Esker", "The inquiry could not be saved. Try again.", "reservations", "reservations-content", nav("reservations")
			a.render(w, "base", data)
		}
		return
	}
	if isHTMX {
		a.render(w, "form-success", data)
	} else {
		data.Title, data.Description, data.Page, data.ContentTemplate, data.Nav, data.Success = "Request received — Esker", "Your availability inquiry has been received.", "reservations", "reservations-content", nav("reservations"), true
		a.render(w, "base", data)
	}
}

func (a *App) newsletter(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 8<<10)
	_ = r.ParseForm()
	if !strings.Contains(r.FormValue("email"), "@") {
		if r.Header.Get("HX-Request") != "true" {
			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			w.WriteHeader(http.StatusUnprocessableEntity)
		}
		fmt.Fprint(w, `<p class="form-note form-note--error" role="alert">Enter a valid email address.</p>`)
		return
	}
	if err := a.store.append(inquiryRecord{Kind: "newsletter", Received: time.Now().UTC(), Email: strings.TrimSpace(r.FormValue("email"))}); err != nil {
		if r.Header.Get("HX-Request") != "true" {
			w.WriteHeader(http.StatusServiceUnavailable)
		}
		fmt.Fprint(w, `<p class="form-note form-note--error" role="alert">We could not save that address. Please try again.</p>`)
		return
	}
	fmt.Fprint(w, `<p class="form-note" role="status" tabindex="-1" data-focus-on-swap>Thank you. Seasonal notes will arrive occasionally.</p>`)
}

func (a *App) render(w http.ResponseWriter, name string, data any) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	if err := a.templates.ExecuteTemplate(w, name, data); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

func (a *App) Generate(root string) error {
	routes := []string{"/", "/menu", "/private-dining", "/journal", "/reservations", "/prompt/"}
	for _, route := range routes {
		info := pageInfo[route]
		data := pageData(info, "", "")
		if info.page == "prompt" {
			raw, _ := os.ReadFile("prompt/reconstruction-prompt.md")
			data.PromptText = string(raw)
		}
		var b bytes.Buffer
		if err := a.templates.ExecuteTemplate(&b, "base", data); err != nil {
			return err
		}
		name := "index.html"
		if route != "/" {
			name = strings.Trim(route, "/") + ".html"
		}
		if err := os.MkdirAll(filepath.Join(root, "pages"), 0o755); err != nil {
			return err
		}
		if err := os.WriteFile(filepath.Join(root, "pages", name), b.Bytes(), 0o644); err != nil {
			return err
		}
		// Write clean index.html for static dir routing (e.g. /menu/index.html)
		cleanDir := filepath.Join(root, strings.TrimPrefix(route, "/"))
		if cleanDir != root {
			if err := os.MkdirAll(cleanDir, 0o755); err == nil {
				_ = os.WriteFile(filepath.Join(cleanDir, "index.html"), b.Bytes(), 0o644)
			}
		}
	}
	for _, course := range courses {
		var b bytes.Buffer
		data := pageData(pageInfo["/menu"], course.Slug, "")
		if err := a.templates.ExecuteTemplate(&b, "base", data); err != nil {
			return err
		}
		if err := os.WriteFile(filepath.Join(root, "pages", "menu-course-"+course.Slug+".html"), b.Bytes(), 0o644); err != nil {
			return err
		}
	}
	for _, service := range services {
		var b bytes.Buffer
		data := pageData(pageInfo["/private-dining"], "", service.Slug)
		if err := a.templates.ExecuteTemplate(&b, "base", data); err != nil {
			return err
		}
		if err := os.WriteFile(filepath.Join(root, "pages", "private-service-"+service.Slug+".html"), b.Bytes(), 0o644); err != nil {
			return err
		}
	}
	var form bytes.Buffer
	if err := a.templates.ExecuteTemplate(&form, "reservation-form", PageData{Form: ReservationForm{}}); err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Join(root, "fragments"), 0o755); err != nil {
		return err
	}
	if err := os.WriteFile(filepath.Join(root, "fragments", "reservation-form.html"), form.Bytes(), 0o644); err != nil {
		return err
	}
	// Write clean fragment file with no extension for HTMX static fetch
	_ = os.WriteFile(filepath.Join(root, "fragments", "reservation-form"), form.Bytes(), 0o644)

	for _, c := range courses {
		var b bytes.Buffer
		if err := a.templates.ExecuteTemplate(&b, "menu-course", c); err != nil {
			return err
		}
		if err := os.MkdirAll(filepath.Join(root, "fragments/menu"), 0o755); err != nil {
			return err
		}
		if err := os.WriteFile(filepath.Join(root, "fragments/menu", c.Slug+".html"), b.Bytes(), 0o644); err != nil {
			return err
		}
		// Write clean fragment file for static fetch without extension
		_ = os.WriteFile(filepath.Join(root, "fragments/menu", c.Slug), b.Bytes(), 0o644)
	}
	for _, s := range services {
		var b bytes.Buffer
		if err := a.templates.ExecuteTemplate(&b, "private-service", s); err != nil {
			return err
		}
		if err := os.MkdirAll(filepath.Join(root, "fragments/private-dining"), 0o755); err != nil {
			return err
		}
		if err := os.WriteFile(filepath.Join(root, "fragments/private-dining", s.Slug+".html"), b.Bytes(), 0o644); err != nil {
			return err
		}
		// Write clean fragment file for static fetch without extension
		_ = os.WriteFile(filepath.Join(root, "fragments/private-dining", s.Slug), b.Bytes(), 0o644)
	}
	return nil
}
