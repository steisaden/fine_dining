package site

import (
	"compress/gzip"
	"io"
	"net/http"
	"path/filepath"
	"strings"
)

func (a *App) Routes() http.Handler {
	mux := http.NewServeMux()
	mux.Handle("GET /public/", http.StripPrefix("/public/", cacheStatic(http.FileServer(http.Dir("public")))))
	mux.Handle("GET /media/", cacheStatic(http.StripPrefix("/media/", http.FileServer(http.Dir("public/media")))))
	mux.Handle("GET /og.png", cacheStatic(http.FileServer(http.Dir("public"))))
	mux.HandleFunc("GET /", a.page)
	mux.HandleFunc("GET /menu", a.page)
	mux.HandleFunc("GET /private-dining", a.page)
	mux.HandleFunc("GET /journal", a.page)
	mux.HandleFunc("GET /reservations", a.page)
	mux.HandleFunc("GET /prompt/", a.page)
	mux.HandleFunc("GET /fragments/menu/{course}", a.menuCourse)
	mux.HandleFunc("GET /fragments/private-dining/{service}", a.privateService)
	mux.HandleFunc("GET /fragments/reservation-form", a.reservationForm)
	mux.HandleFunc("POST /inquiries/reservation", a.submitReservation)
	mux.HandleFunc("POST /inquiries/private-dining", a.submitReservation)
	mux.HandleFunc("POST /newsletter", a.newsletter)
	return securityHeaders(compressText(mux))
}

type gzipResponseWriter struct {
	http.ResponseWriter
	writer io.Writer
}

func (w gzipResponseWriter) Write(p []byte) (int, error) {
	w.Header().Del("Content-Length")
	return w.writer.Write(p)
}

func (w gzipResponseWriter) WriteHeader(status int) {
	w.Header().Del("Content-Length")
	w.ResponseWriter.WriteHeader(status)
}

func compressText(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ext := strings.ToLower(filepath.Ext(r.URL.Path))
		textAsset := ext == "" || ext == ".css" || ext == ".js" || ext == ".html" || ext == ".json" || ext == ".svg"
		if !textAsset || r.Method == http.MethodHead || !strings.Contains(r.Header.Get("Accept-Encoding"), "gzip") {
			next.ServeHTTP(w, r)
			return
		}
		w.Header().Set("Content-Encoding", "gzip")
		w.Header().Add("Vary", "Accept-Encoding")
		w.Header().Del("Content-Length")
		gz := gzip.NewWriter(w)
		defer gz.Close()
		next.ServeHTTP(gzipResponseWriter{ResponseWriter: w, writer: gz}, r)
	})
}

func cacheStatic(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		name := strings.TrimSuffix(r.URL.Path, filepath.Ext(r.URL.Path))
		parts := strings.Split(name, "-")
		fingerprint := parts[len(parts)-1]
		if len(fingerprint) >= 8 && strings.IndexFunc(fingerprint, func(r rune) bool {
			return !((r >= '0' && r <= '9') || (r >= 'a' && r <= 'f') || (r >= 'A' && r <= 'F'))
		}) == -1 {
			w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
		} else {
			w.Header().Set("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400")
		}
		next.ServeHTTP(w, r)
	})
}

func securityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
		w.Header().Set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
		next.ServeHTTP(w, r)
	})
}
