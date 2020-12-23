.DEFAULT_GOAL := help
.PHONY: help
.EXPORT_ALL_VARIABLES:

DOCKER_WORKSPACE := "/markdown"
MOUNTS = --volume ${PWD}:${DOCKER_WORKSPACE} \
	--volume ${DOCKER_WORKSPACE}/node_modules

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

run: build ## Run npm scripts in a docker container. (default: make test.browser)
	docker run -it --rm ${MOUNTS} markdown $(RUN_ARGS)

ci: build ## CI runner for `npm run test.browser -- --ci`
	docker run -i ${MOUNTS} markdown test.browser -- --ci

# I would like this to be `updateSnapshots` but I think it's better to
# be consistent with jest.
updateSnapshot: build ## Run `npm run test.browser -- --updateSnapshot`
	docker run -it --rm ${MOUNTES} markdown test.browser -- --updateSnapshot

shell: build ## Docker shell.
	docker run -it --rm ${MOUNTS} --entrypoint /bin/bash markdown

help: ## Show this help.
	@grep -E '^[a-zA-Z._-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'
