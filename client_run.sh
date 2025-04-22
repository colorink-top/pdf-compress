#!/bin/bash
. ~/.nvm/nvm.sh
nvm use 18.16.0
pm2 delete jopp-pdf-compress-5173-server
pm2 start yarn --name "jopp-pdf-compress-5173-server" -- dev
