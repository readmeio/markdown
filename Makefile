include .env

.DEFAULT_GOAL := help
.PHONY: help
.EXPORT_ALL_VARIABLES:

DOCKER_WORKSPACE := "/markdown"
MOUNTS = --volume ${PWD}:${DOCKER_WORKSPACE} \
	--volume ${DOCKER_WORKSPACE}/node_modules

emojis: example/public/img/emojis ## Install our emojis.

example/public/img/emojis: node_modules/@readme/emojis
	rm -rf example/img/emojis
	rm -rf example/public/img/emojis
	mkdir -p example/public/img/emojis
	cp node_modules/@readme/emojis/src/img/*.png example/public/img/emojis/

mdx:
	npm run build && \
	cp -R dist/* ${README_PATH}/node_modules/@readme/mdx/dist && \
	cd ${README_PATH} && \
	npm run build --workspace=@readme/react && \
	npm run build --workspace=@readme/bundles && \
	npm run ui:build && \
	echo "${NODE_ENV}" > public/data/build-env && \
	npx ts-node ./bin/print-webpack-config.ts > ./build-time-webpack-config.json && \
	npm run ui

ifeq ($(USE_LEGACY), true)
dockerfile = -f Dockerfile.legacy
endif

build:
	@echo USE_LEGACY=$(USE_LEGACY)
	docker build --platform linux/amd64 -t markdown $(dockerfile) --build-arg REACT_VERSION=${REACT_VERSION} .

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
	# We don't mount root because CI doesn't care about live changes,
	# except for grabbing the snapshot diffs, so we mount __tests__.
	# Mounting root would break `make emoji` in the Dockerfile.
	docker run -i \
		--volume ${PWD}/__tests__:${DOCKER_WORKSPACE}/__tests__ \
		--env NODE_VERSION=${NODE_VERSION} \
		markdown test.browser -- --ci

# I would like this to be `updateSnapshots` but I think it's better to
# be consistent with jest.
updateSnapshot: build ## Run `npm run test.browser -- --updateSnapshot`
	docker run -i --rm ${MOUNTS} markdown test.browser -- --updateSnapshot

shell: build ## Docker shell.
	docker run -it --rm ${MOUNTS} --entrypoint /bin/bash markdown

help: ## Show this help.
	@grep -E '^[a-zA-Z._-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'
