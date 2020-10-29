import React, {Component, createRef} from 'react';


export default class App extends Component {
    constructor(props) {
        super(props);
        this.state = {
            showProducts: false,
            supplier: null,
            products: [],
            sheetNumber: null,
            copyJSON: false
        }
        this.textArea = createRef();
        this.products = [];
        this.supplierList = [
            {search: "Бауцентр",
                children: [{
                    search: "10 лет Октября",
                    name: "Бау 10 лет",
                }, {
                    search: "Волгоградская",
                    name: "Бау Вол",
                }]},
            {search: "Леруа",
                children: [{
                    search: "Архитекторов",
                    name: "Леруа Арх",
                }, {
                    search: "Амурская",
                    name: "Леруа Амур",
                }]},
            {search: "ОБИ",
                name: "Оби"}
        ];

    }

    parseProducts = (array) => {
        array.items.forEach((e, index) => {
            if ( (e.str === "ПОД") || (e.str === "БТП") ) {
                let productId = array.items[index - 3].str;
                if (array.items[index - 3].str.length < 3) {
                    productId = array.items[index - 4].str
                }
                this.products.push({id: productId,
                    // Название товара добавляется позже
                    // name: undefined,
                    amount: array.items[index + 2].str,
                    //  weight: convertToNumber(array.items[index + 5].str),
                    //  priceInclVAT: convertToNumber(array.items[index + 11].str),
                });
            }
        });
    }

    // Добавление названия товара, через id товара
    // addProductName = () => {
    //     return this.products.map((el) => {
    //          const currentIndex = parsedText.findIndex((i) => i === el.id);
    //          el.name = parsedText[currentIndex - 2] + parsedText[currentIndex - 1];
    //          return el;
    //      })
    // }

    findDate = (arrayParsedText) => {
        let foundIndex = arrayParsedText.findIndex((i) => i === "Номер ");
        if (arrayParsedText[foundIndex + 1] === "документа") {
            return arrayParsedText[foundIndex + 2];
        }
        if (arrayParsedText.length > 0 && foundIndex !== -1) {
            return this.findDate(arrayParsedText.slice(foundIndex + 1));
        } else {
            return undefined;
        }
    }


    parsePdf = async (e) => {

        let files = e.target.files;
        let reader = new FileReader();
        reader.readAsDataURL(files[0]);
        reader.onload=(event)=> {

            let loadingTask = this.props.pdfjsLib.getDocument(event.target.result);

            loadingTask.promise.then( (pdf) => {

                (async () => {
                    let parsedText = [];
                    this.products = [];
                    for (let i = 1; i <= pdf._pdfInfo.numPages; i++) {

                        let page = await pdf.getPage(i)
                        let result = await page.getTextContent();

                        function parseText(textContent) {
                            let lastY, myArray = [""];
                            for (let item of textContent.items) {
                                if (lastY === item.transform[5] || !lastY) {
                                    myArray[myArray.length - 1] += item.str;
                                } else {
                                    myArray.push(item.str);
                                }
                                lastY = item.transform[5];
                            }
                            //console.log(myArray);
                            return myArray;
                        }

                        this.parseProducts(result);
                        parsedText = parsedText.concat(parseText(result));
                    }


                    let supplier = parsedText[parsedText.findIndex((i) => i === "Вид деятельности по ОКДП") + 1];

                    this.supplierList.some( (el) => {
                        if (supplier.includes( el.search)) {
                            if (el.hasOwnProperty("name")) {
                                supplier = el.name;
                                return true;
                            } else {
                              return el.children.some( elChild => {
                                  if ( supplier.includes( elChild.search ) ) {
                                      supplier = elChild.name;
                                      return true;
                                  }
                                  return false;
                              })
                            }
                        }
                        return false;
                    });

                    let sheetNumber = parsedText[parsedText.findIndex((i) => i === "ТОВАРНАЯ НАКЛАДНАЯ") + 1];

                    let sheetDate = this.findDate(parsedText);


                    this.setState({
                        supplier: supplier,
                        products: this.products,
                        sheetNumber: sheetNumber,
                        sheetDate: sheetDate,
                        showProducts: true,
                        copyJSON: true
                    });




                })(this);




            }, function (reason) {
                // PDF loading error
                console.error(reason);
            });
        }

    };

    componentDidUpdate(prevProps, prevState, snapshot) {
        if (this.state.copyJSON) {
            this.copyCodeToClipboard();
        }
    }

    copyCodeToClipboard = () => {
        this.textArea.current.select();
        document.execCommand("copy");

    }

    render() {
            return (
                <div className="App">
                    {this.state.copyJSON && <div className="popup"><p>JSON Скопирован!</p><p><button onClick={() => this.setState({copyJSON:false})}>Закрыть</button></p></div>}
                    <div className="appSlitBlock">
                        <div className="chooseFile">
                            <h2>Выберите файл для парсинга:</h2>
                            <input type="file" id="input" onChange={(e) => this.parsePdf(e)} multiple />
                        </div>
                    </div>
                    <div  className="appSlitBlock">
                        <div className="parseResult">
                            <p>Поставщик:</p><p><code>{this.state.supplier || "..."}</code></p>
                            <p>Номер документа:</p>
                            <p><code>{this.state.sheetNumber || "..."}</code></p>
                            <p>Дата документа:</p>
                            <p><code>{this.state.sheetDate || "..."}</code></p>
                            <p>Товары:</p>
                            <textarea ref={this.textArea}
                                      style={{width:"100%"}}
                                      rows="10"
                                      value={this.state.showProducts ? JSON.stringify({supplier: this.state.supplier,sheetDate: this.state.sheetDate, sheetNumber: this.state.sheetNumber, products: this.state.products}) : ""}
                                      readOnly={true} />
                        </div>
                    </div>


                </div>
            );
        }


}

