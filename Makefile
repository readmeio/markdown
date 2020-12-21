.DEFAULT_GOAL := help
.PHONY: help
.EXPORT_ALL_VARIABLES:

GITHUB_WORKSPACE := "/github/workspace"

emojis: example/img/emojis ## Install our emojis

example/img/emojis: node_modules/@readme/emojis
	rm -rf example/img/emojis
	mkdir -p example/img/emojis
	cp node_modules/@readme/emojis/src/img/*.png example/img/emojis/

build:
	docker build -t markdown .

ifeq (run,$(firstword $(MAKECMDGOALS)))
  RUN_ARGS := $(wordlist 2,$(words $(MAKECMDGOALS)),$(MAKECMDGOALS))
  $(eval $(RUN_ARGS):;@:)
endif

run: build
	docker run -it --rm -v ${PWD}:${GITHUB_WORKSPACE} markdown $(RUN_ARGS)

shell: build
	docker run -it --rm --entrypoint /bin/bash markdown

help: ## Show this help.
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'
