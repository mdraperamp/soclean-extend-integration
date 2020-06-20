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
     * 
     */
    exports.createProduct = (objProductDetails) => {
        
        log.debug('Extend Product Details', objProductDetails);

        try {
            let url = `${config.domain}/stores/${config.storeId}/products`;
            
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
     * 
     */
    exports.updateProduct = (objProductDetails, stItemId) => {
        
        log.debug('Extend Product Details', objProductDetails);

        try {
            let url = `${config.domain}/stores/${config.storeId}/products/${stItemId}`;

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
     * 
     */
    exports.deleteProduct = async (stItemId) => {
        try {
            const response = await https.get({
                url: `${config.domain}/stores/${config.storeId}/products/${stItemId}`,
                headers: {
                    'Content-Type' : 'application/json',
                    'X-Extend-Access-Token' : config.key
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
     * 
     */
    exports.getPlansByItem = (stItemId) => {
        try {
            const response = https.get({
                url: `${config.domain}/offers?storeId=${config.storeId}&productId=${stItemId}`,
                headers: {
                    'Content-Type' : 'application/json',
                    'X-Extend-Access-Token' : config.key
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
     */
    exports.createWarrantyContract = (objContractDetails) => {
        try {
            const response = https.post({
                url: `${config.domain}/stores/${config.storeId}/contracts`,
                headers: {
                    'Accept' : 'application/json',
                    'Content-Type' : 'application/json',
                    'X-Extend-Access-Token' : config.key
                },
                body: JSON.stringify(objContractDetails)
            });
            if(response.code === 201){
                return JSON.parse(response.body);
            } else {
                log.debug('Error Creating Contract', JSON.stringify(response));
                return {};
            }
        } catch(e) {
            log.debug('Error Calling API', JSON.stringify(e.message));
            return;
        }
    
    };
    /**
     * CANCEL WARRANTY CONTRACT
     * API Documentation: https://developers.extend.com/default#operation/refundContract
     * 
     */
    exports.cancelWarrantyContract = async (contractId) => {
        try {
            const response = await https.get({
                url: `${config.domain}/stores/${config.storeId}/contracts/${contractId}/refund`,
                headers: {
                    'Content-Type' : 'application/json',
                    'X-Extend-Access-Token' : config.key
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