/**
 *@description: 
 *  Scheduled script that is called from by a sales order
 *  that has been created with warranty items. This script is
 *  passed those items as parameters and a warranty contract
 *  is then created for each product in the Extend store.  
 * 
 *@copyright Aimpoint Technology Services, LLC
 *@author Michael Draper
 * 
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 *@ModuleScope Public
 */
define([
    '../Libs/customscript_amp_util',
    '../Libs/customscript_amp_item_api',
    '../Libs/customscript_amp_lib_keys'
], 
(util, api, config) => {
    
    var exports = {};

    // Get input data and build reduce object
    exports.getInputData = context => {
        try {
            
            var objSalesOrders = getSalesOrderDetails();
            log.debug('Orders', objSalesOrders);
            return objSalesOrders;

        } catch(e){

            log.debug('ERROR in getInputData', e);
        }
    };
    exports.map = context => {
        try {
            context.write(context.key, JSON.parse(context.value));
        } catch(e) {
            log.debug('ERROR in MAP stage', e);
        }
    };
    // Iterate through context and create Extend warranty
    exports.reduce = context => {
        try {
            const stOrderId = context.key;
            const objValues = JSON.parse(context.values[0]);
            const objExtendJSON = buildExtendJSON(objValues);

            log.debug('REDUCE: JSON Request Payload for ' + stOrderId, JSON.stringify(objExtendJSON));
            // const response = api.createContract(objExtendJSON);


        } catch(e){
            log.debug('ERROR in REDUCE stage', e);
        }
    };
    exports.summarize = summary => {

    };
    //Get all sales orders that are in need of Extend contract
    const getSalesOrderDetails = () => {

        var arrSearchResults = util.search('transaction', 'customsearch_amp_extend_ex_serial_line');
        var objResults = {};
        var stSerialNumber = '';
        var flPurchasePrice = '';
        
        // Loop through results and build context object containing all the necessary
        // data per line
        for(let i = 0; i < arrSearchResults.length; i++){

            var stItemType = arrSearchResults[i].getValue({name: 'type', join: 'item'});

            // Get the purchase price and serial number for the inventory item
            if(stItemType != 'NonInvtPart'){
                stSerialNumber = arrSearchResults[i].getValue({name: 'serialnumber'});
                flPurchasePrice = parseFloat(arrSearchResults[i].getValue({name: 'amount'}));
                continue;
            }
            // Build context object
            var stOrderId = arrSearchResults[i].id;
            var stLineNumber = arrSearchResults[i].getValue({name: 'linesequencenumber'});
            const stKey = `${stOrderId}_${stLineNumber}`;
            
            objResults[stKey] = {};
            objResults[stKey].id = stOrderId;
            objResults[stKey].tran_date = arrSearchResults[i].getValue({name: 'trandate'});
            objResults[stKey].purchase_price = flPurchasePrice;
            objResults[stKey].item_amount = arrSearchResults[i].getValue({name: 'amount'});
            objResults[stKey].total_amount = arrSearchResults[i].getValue({name: 'total'});
            objResults[stKey].currency = getCurrencyCode(arrSearchResults[i].getValue({name: 'currency'}));
            objResults[stKey].order_number = arrSearchResults[i].getValue({name: 'tranid'});
            objResults[stKey].serial_number = stSerialNumber;
            objResults[stKey].extend_plan_id = arrSearchResults[i].getValue({name: 'custitem_amp_ext_plan_id', join: 'item'});
            objResults[stKey].extend_sku = arrSearchResults[i].getText({name: 'custitem_amp_ext_inv_sku', join: 'item'});
            objResults[stKey].line_amount = arrSearchResults[i].getValue({name: 'amount'});
            objResults[stKey].total_amount = arrSearchResults[i].getValue({name: 'total'});
            objResults[stKey].name = arrSearchResults[i].getText({name: 'entity'});
            objResults[stKey].email = arrSearchResults[i].getValue({name: 'email'});
            objResults[stKey].bill_phone = arrSearchResults[i].getValue({name: 'billphone'});
            objResults[stKey].bill_address = arrSearchResults[i].getValue({name: 'billaddress1'});
            objResults[stKey].bill_city = arrSearchResults[i].getValue({name: 'billcity'});
            objResults[stKey].bill_state = arrSearchResults[i].getValue({name: 'billstate'});
            objResults[stKey].bill_zip = arrSearchResults[i].getValue({name: 'billzip'});
            objResults[stKey].bill_country = arrSearchResults[i].getValue({name: 'billcountry'});
            objResults[stKey].ship_address = arrSearchResults[i].getValue({name: 'shipaddress1'});
            objResults[stKey].ship_city = arrSearchResults[i].getValue({name: 'shipcity'});
            objResults[stKey].ship_state = arrSearchResults[i].getValue({name: 'shipstate'});
            objResults[stKey].ship_zip = arrSearchResults[i].getValue({name: 'shipzip'});
            objResults[stKey].ship_country = arrSearchResults[i].getValue({name: 'shipcountry'});
        }
        return objResults;
    };
    // Get and return currency code
    const getCurrencyCode = currency => {
        var objCurrencyInfo = util.getCurrencyInfo();
        return objCurrencyInfo[currency].code;
    };
    const buildExtendJSON = objValues => {
        var objJSON = {
            "transactionId": objValues.id,
            "transactionDate": objValues.tran_date,
            "transactionTotal": {
                "amount": objValues.total_amount,
                "currencyCode": objValues.currency
            },
            "poNumber": objValues.order_number,
            "customer": {
                "email": objValues.email,
                "name": objValues.name,
                "phone": objValues.phone,
                "billingAddress": {
                    "address1": objValues.bill_address,
                    "city": objValues.bill_city,
                    "provinceCode": objValues.bill_state,
                    "countryCode": objValues.bill_country,
                    "postalCode": objValues.bill_zip
                },
                "shippingAddress": {
                    "address1": objValues.ship_address,
                    "city": objValues.ship_city,
                    "provinceCode": objValues.ship_state,
                    "countryCode": objValues.ship_country,
                    "postalCode": objValues.ship_zip
                }
            },
            "product": {
                "referenceId": objValues.extend_sku,
                "purchasePrice": {
                    "amount": objValues.purchasePrice,
                    "currencyCode": objValues.currency
                }
            },
            "plan": {
                "purchasePrice": {
                    "amount": objValues.amount,
                    "currencyCode": objValues.currency
                },
                "planId": objValues.extend_plan_id
            }
        };
        return objJSON;
    };
    // Return mr functions
    return exports;
});