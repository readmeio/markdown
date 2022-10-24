ARG NODE_VERSION=14
FROM node:${NODE_VERSION}-buster

ARG NODE_VERSION
ENV NODE_VERSION=$NODE_VERSION

RUN apt update && apt install -y \
  chromium \
  fonts-noto-color-emoji

RUN npm install -g npm@latest

ENV DOCKER_WORKSPACE=/markdown
WORKDIR ${DOCKER_WORKSPACE}

COPY package.json package-lock.json ./
RUN npm install

COPY . ./

RUN make emojis

EXPOSE 9966

CMD ["test.browser"]
ENTRYPOINT ["npm", "run"]
