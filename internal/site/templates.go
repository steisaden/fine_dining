package site

import (
	"html/template"
	"time"
)

func parseTemplates() (*template.Template, error) {
	return template.New("").Funcs(template.FuncMap{
		"nowUnix":       func() int64 { return time.Now().Unix() },
		"addOne":        func(i int) int { return i + 1 },
		"indexCourses":  func(i int) Course { return courses[i] },
		"indexServices": func(i int) Service { return services[i] },
	}).ParseGlob("templates/**/*.html")
}
