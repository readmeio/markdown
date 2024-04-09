ARG NODE_VERSION=18
FROM node:${NODE_VERSION}-alpine3.18

ARG NODE_VERSION
ENV NODE_VERSION=$NODE_VERSION

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true
ENV PUPPETEER_EXECUTABLE_PATH /usr/bin/chromium-browser

RUN apk update && apk add \
  make \
  font-noto-emoji \
  font-roboto \
  chromium

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
