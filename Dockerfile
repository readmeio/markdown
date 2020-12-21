FROM node:14-buster

RUN apt update && apt install -y \
  chromium \
  fonts-noto-color-emoji

WORKDIR /github/workflow

COPY package.json package-lock.json ./
RUN npm install

COPY . ./

RUN make emojis

EXPOSE 9966

CMD ["npm", "run", "test.browser"]
