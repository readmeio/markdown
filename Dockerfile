ARG NODE_VERSION=22.13
FROM node:${NODE_VERSION}-alpine

ARG NODE_VERSION
ENV NODE_VERSION=$NODE_VERSION

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true
ENV PUPPETEER_EXECUTABLE_PATH /usr/bin/chromium-browser

RUN apk update && apk add \
  make \
  font-noto-emoji \
  font-roboto \
  chromium

RUN npm install -g npm@10.5

ENV DOCKER_WORKSPACE=/markdown
WORKDIR ${DOCKER_WORKSPACE}

COPY package.json package-lock.json ./
RUN npm install

COPY . ./

RUN mkdir -p __tests__/browser/__image_snapshots__/__diff_output__

EXPOSE 9966

CMD ["test.browser"]
ENTRYPOINT ["npm", "run"]
