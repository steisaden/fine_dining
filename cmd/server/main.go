package main

import (
	"flag"
	"log"
	"net/http"

	"esker/internal/site"
)

func main() {
	addr := flag.String("addr", ":8080", "listen address")
	generate := flag.String("generate", "", "write pre-rendered pages to a directory")
	flag.Parse()

	app, err := site.New()
	if err != nil {
		log.Fatal(err)
	}
	if *generate != "" {
		if err := app.Generate(*generate); err != nil {
			log.Fatal(err)
		}
		return
	}
	log.Printf("Esker listening on http://localhost%s", *addr)
	log.Fatal(http.ListenAndServe(*addr, app.Routes()))
}
