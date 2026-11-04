ARG NODE_VERSION=22.13
FROM node:${NODE_VERSION}-bookworm-slim

ARG NODE_VERSION
ENV NODE_VERSION=$NODE_VERSION

# Playwright's Chromium build is glibc-only, so this image is Debian rather
# than Alpine. Fonts are part of the screenshot baseline.
RUN apt-get update && apt-get install -y --no-install-recommends \
  ca-certificates \
  fontconfig \
  fonts-liberation \
  fonts-noto-color-emoji \
  fonts-noto-core \
  fonts-roboto \
  make \
  && fc-cache -f \
  && rm -rf /var/lib/apt/lists/*

ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV DOCKER_WORKSPACE=/markdown
WORKDIR ${DOCKER_WORKSPACE}

COPY package.json package-lock.json ./
RUN npm ci && npx playwright install --with-deps chromium

COPY . ./

RUN mkdir -p __tests__/browser/__diff_output__

EXPOSE 9966

CMD ["test.browser"]
ENTRYPOINT ["npm", "run"]
