# pdf-compress

It takes any PDF and compress it via ghostscript.

## Context

The applied command is:

```
gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/ebook -dNOPAUSE -dQUIET -dBATCH -sOutputFile=output.pdf input.pdf
```

## Run the project

To run the project, simply do the following steps

```bash
git clone https://github.com/colorink-top/pdf-compress
cd pdf-compress
yarn
yarn dev
```

## Demo

<https://colorink-top.github.io/pdf-compress/>
