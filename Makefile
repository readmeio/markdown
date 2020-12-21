.DEFAULT_GOAL := help
.PHONY: help
.EXPORT_ALL_VARIABLES:

DOCKER_WORKSPACE := "/markdown"

emojis: example/img/emojis ## Install our emojis.

example/img/emojis: node_modules/@readme/emojis
	rm -rf example/img/emojis
	mkdir -p example/img/emojis
	cp node_modules/@readme/emojis/src/img/*.png example/img/emojis/

build:
	docker build -t markdown .

# This lets us call `make run test.browser`. Make expects cmdline args
# to be targets. So this creates noop targets out of args. Copied from
# SO.
ifeq (run,$(firstword $(MAKECMDGOALS)))
  RUN_ARGS := $(wordlist 2,$(words $(MAKECMDGOALS)),$(MAKECMDGOALS))
  $(eval $(RUN_ARGS):;@:)
endif

run: build ## Run npm scripts in a docker container. (ie. make run test.browser)
	docker run -it --rm -v ${PWD}:${DOCKER_WORKSPACE} markdown $(RUN_ARGS)

ci: build ## CI runner for `npm run test.browser`
	docker run -i -v ${PWD}:${DOCKER_WORKSPACE} markdown

shell: build ## Docker shell.
	docker run -it --rm --entrypoint /bin/bash markdown

help: ## Show this help.
	@grep -E '^[a-zA-Z._-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'
