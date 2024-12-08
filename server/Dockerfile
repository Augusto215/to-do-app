# Use uma imagem Node.js como base
FROM node:16

# Defina o diretório de trabalho no contêiner
WORKDIR /usr/src/app

# Copie os arquivos de configuração do projeto
COPY package.json ./
COPY package-lock.json ./

# Instale as dependências
RUN npm install

# Copie o restante dos arquivos do projeto
COPY . .

# Exponha a porta que o app usará
EXPOSE 3000

# Comando para iniciar o servidor
CMD ["node", "server/index.js"]
