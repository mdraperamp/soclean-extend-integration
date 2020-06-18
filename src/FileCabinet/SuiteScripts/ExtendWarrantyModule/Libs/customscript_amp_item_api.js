/**
 * api.js
 * Houses calls to Extend API
 * @param NApiVersion 2.1
 */
define([
    'N/https',
    '../Libs/customscript_amp_lib_keys'
], 
(https, config) => {
    const exports = {};
    /**
     * CREATE PRODUCT
     * API Documentation: https://developers.extend.com/default#tag/Products/paths/~1stores~1{storeId}~1products/post
     * @param description
     * @param price
     * @param title
     * @param referenceId
     */

    exports.createProduct = (objProductDetails) => {
        
        log.debug('Extend Product Details', objProductDetails);

        try {
            let url = `${config.domain}/stores/${config.storeId}/products`;

            log.debug('Calling URL to Create Products', 'url: ' + url + ', Body: ' + JSON.stringify(objProductDetails));
            
            const response = https.post({
                url: url,
                headers: {
                    'Accept' : 'application/json',
                    'Content-Type' : 'application/json',
                    'X-Extend-Access-Token' : config.key
                },
                body: JSON.stringify(objProductDetails)
            });
            if(response.code === 201){
                log.debug('Response', JSON.stringify(response));
                return true;
            }
            else {
                return false;
            }
        } catch(e) {
            log.debug('Error Calling API', JSON.stringify(e));
            return false;
        }
    };
    /**
     * UPDATE PRODUCT
     * API Documentation: https://developers.extend.com/default#tag/Products/paths/~1stores~1{storeId}~1products~1{productId}/put
     * @param description
     * @param price
     * @param title
     * @param referenceId
     */
    exports.updateProduct = (objProductDetails, stItemId) => {
        
        log.debug('Extend Product Details', objProductDetails);

        try {
            let url = `${config.domain}/stores/${config.storeId}/products/${stItemId}`;

            log.debug('Calling URL to Create Products', 'url: ' + url + ', Body: ' + JSON.stringify(objProductDetails));
            
            const response = https.put({
                url: url,
                headers: {
                    'Accept' : 'application/json',
                    'Content-Type' : 'application/json',
                    'X-Extend-Access-Token' : config.key
                },
                body: JSON.stringify(objProductDetails)
            });
            if(response.code === 200){
                log.debug('Response', JSON.stringify(response));
                return true;
            }
            else {

                return false;
            }
        } catch(e) {
            log.debug('Error Calling API', JSON.stringify(e));
            return false;
        }
    };
    /**
     * DELETE PRODUCT
     * API Documentation: https://developers.extend.com/default#tag/Products/paths/~1stores~1{storeId}~1products~1{productId}/delete
     * Params
     * @param param contractId
     */
    exports.deleteProduct = async (stItemId) => {
        try {
            const response = await https.get({
                url: `${config.domain}/stores/${config.storeId}/products/${stItemId}`,
                headers: {
                    'Content-Type' : 'application/json',
                    'X-Extend-Access-Token' : JSON.stringify(config.key)
                }
            });
            if(response){
                return JSON.parse(response.body);
            }
        } catch(e) {
            log.debug('Error Cancelling Contract', JSON.stringify(e.message));
            return;
        }
    
    };
    /**
     * FETCH PLANS BY ITEM
     * API Documentation: https://developers.extend.com/default#operation/getOffer
     * @param description
     * @param price
     * @param title
     * @param referenceId
     */
    exports.getPlansByItem = (stItemId) => {
        try {
            const response = https.get({
                url: `${config.domain}/offers?storeId=${config.storeId}&productId=${stItemId}`,
                headers: {
                    'Content-Type' : 'application/json',
                    'X-Extend-Access-Token' : JSON.stringify(config.key)
                }
            });
            if(response){
                return JSON.parse(response.body);
            }
        } catch(e) {
            log.debug('Error Fetcing Plans', JSON.stringify(e.message));
            return;
        }
    
    };
    /**
     * CREATE WARRANTY CONTRACT
     * API Documentation: https://developers.extend.com/default#operation/createContracts
     * 
     *  "*" is a required parameter and/or key/value pair
     * Params
     * @param transactionId*
     * @param transactionTotal*
     * @param customer* {phone, email*, name*, address}
     * @param product* {referenceId*, purchasePrice*, serialNumber}
     * @param currency*
     * @param transactionDate*
     * @param plan* {pruchasePrice*, planId*}
     */
    exports.createWarrantyContract = (objContractDetails) => {
        try {
            const response = https.get({
                url: `${config.domain}/stores/${config.storeId}/contracts`,
                headers: {
                    'Content-Type' : 'application/json',
                    'X-Extend-Access-Token' : JSON.stringify(config.key)
                }
            });
            if(response){
                return JSON.parse(response.body);
            }
        } catch(e) {
            log.debug('Error Creating Contract', JSON.stringify(e.message));
            return;
        }
    
    };
    /**
     * CANCEL WARRANTY CONTRACT
     * API Documentation: https://developers.extend.com/default#operation/refundContract
     * @param contractId
     */
    exports.cancelWarrantyContract = async (contractId) => {
        try {
            const response = await https.get({
                url: `${config.domain}/stores/${config.storeId}/contracts/${contractId}/refund`,
                headers: {
                    'Content-Type' : 'application/json',
                    'X-Extend-Access-Token' : JSON.stringify(config.key)
                }
            });
            if(response){
                return JSON.parse(response.body);
            }
        } catch(e) {
            log.debug('Error Cancelling Contract', JSON.stringify(e.message));
            return;
        }
    
    };
    return exports;
});