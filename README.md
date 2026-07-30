# Esker

A production-oriented fine-dining website built with Go templates, HTMX, native video, and focused JavaScript.

## Run locally

Requirements: Go 1.22+ and Node 20+.

```sh
go run ./cmd/server
```

Open `http://localhost:8080`.

## Validate and build

```sh
gofmt -w cmd internal
go test ./...
go vet ./...
pnpm run build
```

The build pre-renders Go pages for the Cloudflare Worker deployment adapter. The Go server remains the source implementation for routes, fragments, and conventional form behavior.

## Media

`public/media/fine_dining_60fps.mp4` is the unmodified supplied master. Its size makes adaptive web delivery a recommended follow-up: add derived low-bandwidth variants and a poster while retaining this master unchanged.

## Inquiry persistence

The Go server appends validated reservation and newsletter records to `data/inquiries.ndjson` with mode `0600`. Set `ESKER_INQUIRY_FILE` to place that file in an encrypted, backed-up location outside the repository. The ignored `data/` default is for local operation only; define an access and deletion policy before accepting real guest data.

The edge worker requires a KV-compatible `INQUIRIES` binding. Valid submissions are acknowledged only after `INQUIRIES.put` succeeds. If the binding is absent or a write fails, the form retains the guest’s entries and reports that nothing was saved instead of returning a false success.
