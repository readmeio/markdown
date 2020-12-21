.DEFAULT_GOAL := help
.PHONY: help
.EXPORT_ALL_VARIABLES:

GITHUB_WORKFLOW_DIR := "/github/workflow"

emojis: example/img/emojis ## Install our emojis

example/img/emojis: node_modules/@readme/emojis
	rm -rf example/img/emojis
	mkdir -p example/img/emojis
	cp node_modules/@readme/emojis/src/img/*.png example/img/emojis/

docker_build:
	docker build -t markdown .

browser_tests: docker_build
	docker run -it --rm -v ${PWD}:${GITHUB_WORKFLOW_DIR} markdown

shell: docker_build
	docker run -it --rm markdown /bin/bash

help: ## Show this help.
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'
