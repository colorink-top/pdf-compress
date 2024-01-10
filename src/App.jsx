import {useState, useEffect} from 'react'
import { PDFDocument } from 'pdf-lib'

import './App.css'
import {_GSPS2PDF} from "./lib/background.js";


function getAllUrlParams(url) {

  // get query string from url (optional) or window
  var queryString = url ? url.split('?')[1] : window.location.search.slice(1);

  // we'll store the parameters here
  var obj = {};

  // if query string exists
  if (queryString) {

    // stuff after # is not part of query string, so get rid of it
    queryString = queryString.split('#')[0];

    // split our query string into its component parts
    var arr = queryString.split('&');

    for (var i = 0; i < arr.length; i++) {
      // separate the keys and the values
      var a = arr[i].split('=');

      // set parameter name and value (use 'true' if empty)
      var paramName = a[0];
      var paramValue = typeof (a[1]) === 'undefined' ? true : a[1];

      // (optional) keep case consistent
      paramName = paramName.toLowerCase();
      if (typeof paramValue === 'string') paramValue = paramValue.toLowerCase();

      // if the paramName ends with square brackets, e.g. colors[] or colors[2]
      if (paramName.match(/\[(\d+)?\]$/)) {

        // create key if it doesn't exist
        var key = paramName.replace(/\[(\d+)?\]/, '');
        if (!obj[key]) obj[key] = [];

        // if it's an indexed array e.g. colors[2]
        if (paramName.match(/\[\d+\]$/)) {
          // get the index value and add the entry at the appropriate position
          var index = /\[(\d+)\]/.exec(paramName)[1];
          obj[key][index] = paramValue;
        } else {
          // otherwise add the value to the end of the array
          obj[key].push(paramValue);
        }
      } else {
        // we're dealing with a string
        if (!obj[paramName]) {
          // if it doesn't exist, create property
          obj[paramName] = paramValue;
        } else if (obj[paramName] && typeof obj[paramName] === 'string'){
          // if property does exist and it's a string, convert it to an array
          obj[paramName] = [obj[paramName]];
          obj[paramName].push(paramValue);
        } else {
          // otherwise add the property
          obj[paramName].push(paramValue);
        }
      }
    }
  }

  return obj;
}


const b64toBlob = (b64Data, contentType='', sliceSize=512) => {
  const b64Datas = b64Data.split(',')
  if (b64Datas.length > 1) {
    b64Data = b64Datas[1];
    contentType = b64Datas[0].split(':')[1].split(';')[0]
  }
  const byteCharacters = atob(b64Data);
  const byteArrays = [];

  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    const slice = byteCharacters.slice(offset, offset + sliceSize);

    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  const blob = new Blob(byteArrays, {type: contentType});
  return blob;
}


function loadPDFData(response, filename) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("GET", response.pdfDataURL);
        xhr.responseType = "arraybuffer";
        xhr.onload = async function () {
            window.URL.revokeObjectURL(response.pdfDataURL);
            const pdfDoc = await PDFDocument.load(xhr.response)
            pdfDoc.setProducer('SNW | https://colorink-top.github.io/pdf-compress/')
            const uint8Array = await pdfDoc.save();
            const blob = new Blob([uint8Array], {type: "application/pdf"});
            const pdfURL = window.URL.createObjectURL(blob);
            resolve({pdfURL, blob})
        };
        xhr.send();
    })

}

function blobToDataURL (data) {
  return new Promise((resolve, reject)=>{
    const fileReader = new FileReader();
    fileReader.onerror = function(e) {
      reject(e)
    };
    fileReader.onload = function() {
      resolve(fileReader.result)
    };
    fileReader.readAsDataURL(data);
  });
};



function App() {
    const [state, setState] = useState("init")
    const [file, setFile] = useState(undefined)
    const [downloadLink, setDownloadLink] = useState(undefined)

    function compressPDF(pdf, filename, callback) {
        const dataObject = {psDataURL: pdf}
        _GSPS2PDF(dataObject,
            (element) => {
                console.log(element);
                setState("toBeDownloaded")
                loadPDFData(element, filename).then(({pdfURL, blob}) => {
                    if (callback) {
                      callback(pdfURL, blob)
                    }
                    setDownloadLink(pdfURL)
                });
            },
            (...args) => console.log("Progress:", JSON.stringify(args)),
            (element) => console.log("Status Update:", JSON.stringify(element)))
    }

    const changeHandler = (event) => {
        const file = event.target.files[0]
        const url = window.URL.createObjectURL(file);
        setFile({filename: file.name, url})
        setState('selected')
    };

    const onSubmit = (event) => {
        event.preventDefault();
        const {filename, url} = file;
        compressPDF(url, filename)
        setState("loading")
        return false;
    }

    useEffect(()=>{
      let status = ''
      const messageMap = {};

      const params = getAllUrlParams(document.location.href)
      const uniqueId = params.uniqueid + '';

      const sendMessageAsyncFn = async (event, data, num,next)=> {
        return new Promise(function(resolve){
          event.source.postMessage({
            type: 'receiveData',
            data,
            num,
            next
          }, event.origin)
          messageMap[num] = ()=>{
            resolve()
          }
        });
      }

      const messageFn = (event)=>{
        if (event.source === window) {
          return
        }
        const msg = event.data || {};
        switch (msg.type) {
          case 'init': {
            if (msg.uniqueId + '' !== uniqueId) {return}
            if (status === 'init') {return}
            status = `init`;
            setTimeout(()=>{
              status = 'inited'
              event.source.postMessage({type: 'inited', byBlob: msg.byBlob}, event.origin);
            }, 1000)
            break
          }
          case 'receiveResult': {
            const num = msg.num;
            const callbackFn = messageMap[num];
            if (callbackFn) {
              delete messageMap[num];
              callbackFn();
            }
            break;
          }
          case 'sendDataByBlob': {
            const blob = msg.data;
            const blobURL = window.URL.createObjectURL(blob)
            compressPDF(blobURL, 'temp.pdf', async (pdfURL, blob)=>{
              event.source.postMessage({
                type: 'receiveDataByBlob',
                data: blob,
              }, event.origin)
            })
            break;
          }
          case 'sendData': {
            if (msg.next) {
              messageMap[msg.num] = msg.data
            } else {
              const dataURL = []
              const keys = Object.keys(messageMap).sort()
              keys.forEach((key, _i)=>{
                dataURL.push(messageMap[_i+1])
                delete messageMap[_i+1]
              })
              const blob = b64toBlob(dataURL.join(''))
              const blobURL = window.URL.createObjectURL(blob)
              compressPDF(blobURL, 'temp.pdf', async (pdfURL, blob)=>{
                const newDataURL = await blobToDataURL(blob)

                let subText = newDataURL;
                const maxLength = 200000;
                let num = 1;
                do {
                  const postText = subText.substring(0, maxLength);
                  subText = subText.substring(maxLength);
                  await sendMessageAsyncFn(event, postText, num++, true)
                } while (subText.length > 0)
                sendMessageAsyncFn(event, '', num, false)
              })
            }
            event.source.postMessage({
              type: 'sendResult',
              num: msg.num
            }, event.origin)
            break;
          }
        }
      }
      window.addEventListener('message', messageFn)
      return ()=> {
        window.removeEventListener('message', messageFn)
      }
    }, [])

    let minFileName = file && file.filename && file.filename.replace('.pdf', '-min.pdf');
    return (
        <>
            <h1>PDF-Compressor</h1>
            {state !== "loading" && state !== "toBeDownloaded" &&
                <form onSubmit={onSubmit}>
                    <input type="file" accept={"application/pdf"} name="file"
                           onChange={changeHandler} id={"file"}/>
                    <div className={"label padded-button"}>
                        <label
                            htmlFor={"file"}>{!file || !file.filename ? `Choose PDF to compress` : file.filename}</label>
                    </div>
                    {state === 'selected' &&
                        <div className={"success-button padded-button padding-top"}>
                            <input className={"button"} type="submit"
                                   value={"🚀 Compress this PDF! 🚀"}/>
                        </div>
                    }

                </form>}
            {state === "loading" && "Loading...."}
            {state === "toBeDownloaded" &&
                <>
                    <div className={"success-button padded-button"}>
                        <a href={downloadLink} download={minFileName}>
                            {`📄 Download ${minFileName} 📄`}
                        </a>
                    </div>
                    <div className={"blue padded-button padding-top"}>
                        <a href={'./'}>
                            {`🔁 Compress another PDF 🔁`}
                        </a>
                    </div>
                </>
            }
        </>
    )
}

export default App
