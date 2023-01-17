document.addEventListener("DOMContentLoaded", function(event) {

    function textFromTagging(value) {
        let node = document.querySelector("body > div.nosto_product > span."+value)
        if (node){
            let element = document.createElement("div")
            element.innerText = value + " : " + node.innerText
            body.appendChild(element)
        }
    }

    function textNode(text, target){
        let element = document.createElement("div")
        element.innerText = text
        target? target.appendChild(element): body.appendChild(element)
    }

    document.querySelector("body > div.nosto_product").style = "display: none"
   //<input type="button" value="Back" onclick="window.history.back()" />
   let backButton = document.createElement("input")
    backButton.type = "button"
    backButton.value = "Go back"
    backButton.onclick = () => window.history.back()

    let body = document.querySelector('body')
    body.appendChild(backButton)

    let img = document.createElement('img');
    img.src = document.querySelector("body > div.nosto_product > span.image_url").innerText
    img.id="inserted"
    img.height=200
    body.appendChild(img);


    textFromTagging("name");
    textFromTagging("product_id");
    textFromTagging("price");
    textFromTagging("price_currency_code");
    textFromTagging("availability");
    textFromTagging("description");
    textFromTagging("brand");
    textFromTagging("selected_sku_id");
    let skus = document.querySelectorAll("span.nosto_sku");
    if (skus) {
        let skuDisplay = document.createElement("div")
        skuDisplay.style = "border-style: dotted;"
        textNode("SKUS found "+skus.length, skuDisplay)

        skus.forEach(sku => {
            let nameNode = sku.querySelector("span.name")
            if (nameNode) {
                let name = "name : " + sku.querySelector("span.name").innerText
                textNode(name, skuDisplay)
                let customFields = sku.querySelectorAll("span.custom_fields > span")
                customFields.forEach(span => textNode(span.className +" : "+ span.innerText, skuDisplay))
            }
        })
        body.appendChild(skuDisplay)
    }
});