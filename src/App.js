import React, {Component} from 'react';


export default class App extends Component {

    state ={
        supplier: null,
        products: [],
    }

    myFunc = async (e) => {

        let files = e.target.files;
        let reader = new FileReader();
        reader.readAsDataURL(files[0]);
        reader.onload=(event)=> {


            let pdfjsLib = window['pdfjs-dist/build/pdf'];
            pdfjsLib.GlobalWorkerOptions.workerSrc = '//cdnjs.cloudflare.com/ajax/libs/pdf.js/2.5.207/pdf.worker.min.js';
            let loadingTask = pdfjsLib.getDocument(event.target.result);


            loadingTask.promise.then( (pdf) => {

                (async () => {
                    let parsedText = [], products = [];

                    for (let i = 1; i <= pdf._pdfInfo.numPages; i++) {

                        let page = await pdf.getPage(i)
                        let result = await page.getTextContent();

                        function parseText(textContent) {
                            let lastY, myArray = [""];
                            for (let item of textContent.items) {
                                if (lastY == item.transform[5] || !lastY) {
                                    myArray[myArray.length - 1] += item.str;
                                } else {
                                    myArray.push(item.str);
                                }
                                lastY = item.transform[5];
                            }
                            return myArray;
                        }
                        function parseProducts(array) {
                            array.items.forEach((e, index) => {
                                if ( (e.str === "ПОД") || (e.str === "БТП") ) {
                                    let productId = array.items[index - 3].str;
                                    if (array.items[index - 3].str.length < 3) {
                                        productId = array.items[index - 4].str
                                    }
                                    products.push({id: productId,
                                                    name: undefined,
                                                    amount: array.items[index + 3].str,
                                                    weight: convertToNumber(array.items[index + 5].str),
                                                    priceInclVAT: convertToNumber(array.items[index + 11].str),
                                    });
                                }
                            });
                        }
                        function convertToNumber(itemString) {
                            return +(itemString.replace(",", ".").replace(" ", ""))
                        }

                        parseProducts(result);
                        parsedText = parsedText.concat(parseText(result));

                    }

                    let supplier = parsedText[parsedText.findIndex((i) => i === "Плательщик") + 1];
                    products = products.map((el) => {
                        const currentIndex = parsedText.findIndex((i) => i === el.id);
                        el.name = parsedText[currentIndex - 2] + parsedText[currentIndex - 1];
                        return el;
                    })

                    this.setState({
                        supplier: supplier,
                        products: products
                    });




                })(this);




            }, function (reason) {
                // PDF loading error
                console.error(reason);
            });
        }

    };


        render() {
            return (
                <div className="App">
                    <div className="appSlitBlock">
                        <div className="chooseFile">
                            <h2>Выберите файл для парсинга:</h2>
                            <input type="file" id="input" onChange={(e) => this.myFunc(e)} multiple />
                        </div>
                    </div>
                    <div  className="appSlitBlock">
                        <div className="parseResult">
                            <p>Поставщик:</p><p><code>{this.state.supplier || "..."}</code></p>
                            <p>Товары:</p>
                            <p><code>{JSON.stringify(this.state.products)}</code></p>
                        </div>
                    </div>


                </div>
            );
        }


}

