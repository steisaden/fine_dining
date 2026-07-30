package site

import (
	"compress/gzip"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"testing"
	"time"
)

func testApp(t *testing.T) *App {
	t.Helper()
	t.Setenv("ESKER_INQUIRY_FILE", filepath.Join(t.TempDir(), "inquiries.ndjson"))
	cwd, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	if strings.HasSuffix(cwd, "/internal/site") {
		if err := os.Chdir("../.."); err != nil {
			t.Fatal(err)
		}
		t.Cleanup(func() { _ = os.Chdir(cwd) })
	}
	app, err := New()
	if err != nil {
		t.Fatal(err)
	}
	return app
}

func TestFullPageAndFragmentRoutes(t *testing.T) {
	handler := testApp(t).Routes()
	tests := []struct {
		path, contains string
	}{
		{"/", "The course begins"},
		{"/menu", "Course index"},
		{"/private-dining", "Four formats"},
		{"/journal", "What the plate leaves unsaid"},
		{"/reservations", "Send availability inquiry"},
		{"/prompt/", "Decisions that survived implementation"},
		{"/fragments/menu/fourth", "Duck · blackcurrant"},
		{"/fragments/private-dining/chef-table", "Chef’s-table evenings"},
		{"/fragments/reservation-form", "name=\"preferred_date\""},
	}
	for _, tt := range tests {
		t.Run(tt.path, func(t *testing.T) {
			recorder := httptest.NewRecorder()
			handler.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, tt.path, nil))
			if recorder.Code != http.StatusOK {
				t.Fatalf("status = %d", recorder.Code)
			}
			if !strings.Contains(recorder.Body.String(), tt.contains) {
				t.Fatalf("response does not contain %q", tt.contains)
			}
		})
	}
}

func TestShareableDetailStates(t *testing.T) {
	handler := testApp(t).Routes()
	for _, tt := range []struct {
		path, selected string
	}{
		{"/menu?course=fourth", "Duck · blackcurrant"},
		{"/private-dining?service=collaborations", "Short-form menus developed"},
	} {
		recorder := httptest.NewRecorder()
		handler.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, tt.path, nil))
		if recorder.Code != http.StatusOK || !strings.Contains(recorder.Body.String(), tt.selected) {
			t.Fatalf("%s did not render selected state", tt.path)
		}
	}
}

func TestReservationValidationAndSuccess(t *testing.T) {
	handler := testApp(t).Routes()
	invalid := url.Values{"name": {"Stephen"}, "email": {"invalid"}, "started_at": {strconv.FormatInt(time.Now().Unix()-5, 10)}}

	htmxRequest := httptest.NewRequest(http.MethodPost, "/inquiries/reservation", strings.NewReader(invalid.Encode()))
	htmxRequest.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	htmxRequest.Header.Set("HX-Request", "true")
	htmxRecorder := httptest.NewRecorder()
	handler.ServeHTTP(htmxRecorder, htmxRequest)
	if htmxRecorder.Code != http.StatusOK || !strings.Contains(htmxRecorder.Body.String(), "value=\"Stephen\"") || !strings.Contains(htmxRecorder.Body.String(), "Enter a valid email address") {
		t.Fatalf("HTMX validation response did not retain values and errors: status %d", htmxRecorder.Code)
	}

	standardRequest := httptest.NewRequest(http.MethodPost, "/inquiries/reservation", strings.NewReader(invalid.Encode()))
	standardRequest.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	standardRecorder := httptest.NewRecorder()
	handler.ServeHTTP(standardRecorder, standardRequest)
	if standardRecorder.Code != http.StatusUnprocessableEntity || !strings.Contains(standardRecorder.Body.String(), "Review the request") {
		t.Fatalf("conventional validation status = %d", standardRecorder.Code)
	}

	valid := url.Values{
		"name": {"Stephen"}, "email": {"stephen@example.com"}, "preferred_date": {"2026-12-12"},
		"guest_count": {"4"}, "service_type": {"private"}, "location": {"Amsterdam"},
		"consent": {"yes"}, "started_at": {strconv.FormatInt(time.Now().Unix()-5, 10)},
	}
	successRequest := httptest.NewRequest(http.MethodPost, "/inquiries/reservation", strings.NewReader(valid.Encode()))
	successRequest.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	successRequest.Header.Set("HX-Request", "true")
	successRecorder := httptest.NewRecorder()
	handler.ServeHTTP(successRecorder, successRequest)
	if successRecorder.Code != http.StatusOK || !strings.Contains(successRecorder.Body.String(), "remains subject to availability") {
		t.Fatalf("success response = %d %s", successRecorder.Code, successRecorder.Body.String())
	}
	stored, err := os.ReadFile(os.Getenv("ESKER_INQUIRY_FILE"))
	if err != nil || !strings.Contains(string(stored), `"name":"Stephen"`) || !strings.Contains(string(stored), `"kind":"reservation"`) {
		t.Fatalf("validated inquiry was not durably stored: %v", err)
	}
}

func TestReservationFailsClosedWhenPersistenceIsUnavailable(t *testing.T) {
	app := testApp(t)
	app.store.path = filepath.Join("/dev/null", "inquiries.ndjson")
	handler := app.Routes()
	valid := url.Values{
		"name": {"Stephen"}, "email": {"stephen@example.com"}, "preferred_date": {"2026-12-12"},
		"guest_count": {"4"}, "service_type": {"private"}, "location": {"Amsterdam"},
		"consent": {"yes"}, "started_at": {strconv.FormatInt(time.Now().Unix()-5, 10)},
	}
	request := httptest.NewRequest(http.MethodPost, "/inquiries/reservation", strings.NewReader(valid.Encode()))
	request.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	request.Header.Set("HX-Request", "true")
	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, request)
	if recorder.Code != http.StatusOK || !strings.Contains(recorder.Body.String(), "could not save your request") || strings.Contains(recorder.Body.String(), "Request received") {
		t.Fatalf("persistence failure did not fail closed: %d %s", recorder.Code, recorder.Body.String())
	}
}

func TestStaticCachePolicy(t *testing.T) {
	handler := testApp(t).Routes()
	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/public/css/base.css", nil))
	if got := recorder.Header().Get("Cache-Control"); got != "public, max-age=3600, stale-while-revalidate=86400" {
		t.Fatalf("Cache-Control = %q", got)
	}
	ogRecorder := httptest.NewRecorder()
	handler.ServeHTTP(ogRecorder, httptest.NewRequest(http.MethodGet, "/og.png", nil))
	if ogRecorder.Code != http.StatusOK || ogRecorder.Header().Get("Content-Type") != "image/png" {
		t.Fatalf("OG image response = %d %q", ogRecorder.Code, ogRecorder.Header().Get("Content-Type"))
	}
}

func TestTextResponsesSupportGzip(t *testing.T) {
	handler := testApp(t).Routes()
	request := httptest.NewRequest(http.MethodGet, "/menu", nil)
	request.Header.Set("Accept-Encoding", "gzip")
	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, request)
	if recorder.Header().Get("Content-Encoding") != "gzip" {
		t.Fatal("expected gzip content encoding")
	}
	reader, err := gzip.NewReader(recorder.Body)
	if err != nil {
		t.Fatal(err)
	}
	body, err := io.ReadAll(reader)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(body), "Course index") {
		t.Fatal("compressed response did not contain menu content")
	}
}
