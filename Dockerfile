FROM node:14-buster AS markdown-browser

RUN apt update && apt install -y \
  chromium \
  fonts-noto-color-emoji

FROM markdown-browser

ENV GITHUB_WORKSPACE = /github/workspace
WORKDIR ${GITHUB_WORKSPACE}

COPY package.json package-lock.json ./
RUN npm install

VOLUME ${GITHUB_WORKSPACE}/node_modules

COPY . ./

RUN make emojis

EXPOSE 9966

CMD ["test.browser"]
ENTRYPOINT ["npm", "run"]
