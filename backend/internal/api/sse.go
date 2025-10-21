package api

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/gorilla/mux"
	"github.com/rapidbuildapp/rapidbuild/internal/middleware"
)

// SSEHandler handles Server-Sent Events for build progress
func (h *AppHandler) SSEHandler(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.GetUserFromContext(r.Context())
	if !ok {
		middleware.RespondError(w, http.StatusUnauthorized, "User not found in context")
		return
	}

	vars := mux.Vars(r)
	versionID := vars["versionId"]

	// Verify user owns the app
	version, err := h.VersionService.GetVersion(r.Context(), versionID)
	if err != nil {
		middleware.RespondError(w, http.StatusNotFound, "Version not found")
		return
	}

	_, err = h.AppService.GetApp(r.Context(), version.AppID, user.Sub)
	if err != nil {
		middleware.RespondError(w, http.StatusNotFound, "App not found")
		return
	}

	// Set SSE headers
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming unsupported", http.StatusInternalServerError)
		return
	}

	// Send initial connection message
	fmt.Fprintf(w, "data: {\"status\":\"connected\"}\n\n")
	flusher.Flush()

	// Listen for progress updates
	for {
		select {
		case <-r.Context().Done():
			return
		case progress := <-h.Builder.ProgressChan:
			// Only send progress for this version
			if progress.VersionID == versionID {
				data, _ := json.Marshal(progress)
				fmt.Fprintf(w, "data: %s\n\n", data)
				flusher.Flush()

				// Close connection when build is complete or failed
				if progress.Status == "completed" || progress.Status == "failed" {
					return
				}
			}
		}
	}
}
