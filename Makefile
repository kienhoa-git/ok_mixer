# Variables
EXTENSION_ID = $(shell grep -Po '(?<="uuid": ")[^"]*' metadata.json)
SRC_DIR = src
DIST_DIR = dist
EXTRA_SOURCES = $(SRC_DIR)

.PHONY: all pack clean install

# Default target
all: pack

# Create the distribution directory and pack the extension
pack:
	@echo "Packing extension: $(EXTENSION_ID)..."
	@mkdir -p $(DIST_DIR)
	gnome-extensions pack . --extra-source=$(EXTRA_SOURCES) --out-dir=$(DIST_DIR) --force
	@echo "Done! Zip file located in $(DIST_DIR)"

# Optional: Install the extension locally for testing
install: pack
	gnome-extensions install $(DIST_DIR)/$(EXTENSION_ID).shell-extension.zip --force
	@echo "Extension installed. Restart GNOME Shell or log out to apply."

# Clean up the dist directory
clean:
	@rm -rf $(DIST_DIR)
	@echo "Cleaned $(DIST_DIR)"
