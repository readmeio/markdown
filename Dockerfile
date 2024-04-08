ARG NODE_VERSION=18
FROM node:${NODE_VERSION}

ARG NODE_VERSION
ENV NODE_VERSION=$NODE_VERSION

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

RUN apt-get update && apt-get install -y \
  curl \
  gnupg \
  fonts-noto-color-emoji \
  && curl --location --silent https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
  && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
  && apt-get update \
  && apt-get install google-chrome-stable -y --no-install-recommends \
  && rm -rf /var/lib/apt/lists/*

RUN npm install -g npm@latest

ENV DOCKER_WORKSPACE=/markdown
WORKDIR ${DOCKER_WORKSPACE}

COPY package.json package-lock.json ./
RUN npm install

COPY . ./

RUN mkdir -p __tests__/browser/__image_snapshots__/__diff_output__

RUN make emojis

EXPOSE 9966

CMD ["test.browser"]
ENTRYPOINT ["npm", "run"]
