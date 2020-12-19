FROM node:14-buster

RUN apt update && apt install -y \
  chromium \
  fonts-noto-color-emoji

RUN mkdir /markdown
WORKDIR /markdown

COPY package.json package-lock.json ./
RUN npm install

COPY . ./

RUN make emojis

EXPOSE 9966

CMD ["npm", "run", "start"]
