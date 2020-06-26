/**
 *@description: 
 *  Mapreduce script that runs on a scheduled basis
 *  to pulled newly created SO's with warranty items
 *  and create Extend warranty contracts for them. The 
 *  script creates the contract in Extend and writes
 *  the contract ID back to the warranty item column
 *  Extend Contract ID  
 * 
 *@copyright Aimpoint Technology Services, LLC
 *@author Michael Draper
 * 
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 *@ModuleScope Public
 */
define([
    'N/record',
    'N/search',
    'N/format',
    '../Libs/customscript_amp_util',
    '../Libs/customscript_amp_item_api'
], 
(record, search, format, util, api) => {
    
    var exports = {};
    // Get input data and build reduce object
    exports.getInputData = context => {
        try {
            // Fetch all elible sales orders
            var arrElibgibleOrders = getElibleOrders();
            var objSalesOrderDetails = {};
            // Loop through result and build Sales Order Detail Object
            if(arrElibgibleOrders.length > 0){
                for(let i = 0; i < arrElibgibleOrders.length; i++){
                    var stOrderId = arrElibgibleOrders[i].id;
                    // Build detail object
                    getSalesOrderDetails(stOrderId, objSalesOrderDetails);
                }
            }
            log.debug('GET INPUT DATA: Orders', objSalesOrderDetails);

            return objSalesOrderDetails;

        } catch(e){

            log.debug('ERROR in getInputData', e);
        }
    };
    exports.map = context => {
        try {
            log.debug('MAP: Context', context);
            // Suitescript 2.1 requires MAP *Possible bug*
            context.write(context.key, JSON.parse(context.value));

        } catch(e) {
            log.debug('ERROR in MAP stage', e);
        }
    };
    // Iterate through context and create Extend warranty
    exports.reduce = context => {
        try {
            // Parse values
            const objValues = JSON.parse(context.values[0]);
            const stOrderId = objValues.id;

            // Build the Extend JSON from the details object
            const objExtendJSON = buildExtendJSON(objValues);
            log.debug('REDUCE: JSON Request Payload for ' + stOrderId, JSON.stringify(objExtendJSON));
            
            // Call Extend API to create the warrant contract
            const objResponse = api.createWarrantyContract(objExtendJSON);
            log.debug('REDUCE: JSON Response Payload for ' + stOrderId, objResponse);
            
            // If contract is created, write the contract ID and Item Serial number 
            // back to the Sales Order line
            if(objResponse.id){
                const stContractId = objResponse.id;
                updateSalesOrder(stOrderId, objValues, stContractId);
                log.debug('REDUCE: Sales Order Update SUCCESS: ', stOrderId);
            }

        } catch(e){
            log.debug('ERROR in REDUCE stage', e);
        }
    };
    exports.summarize = summary => {
        // No Summary Requirements at the time of build
    };
    // Get all sales orders that are in need of Extend contract
    const getElibleOrders = () => {
        // Custom Search EXTEND: Eligible Sales Orders for Contract Creation MR
        var arrSearchResults = util.search('transaction', 'customsearch_amp_ext_eligible_orders');

        return arrSearchResults;
    };
    const getSalesOrderDetails = (stOrderId, objResults) => {
        
        var arrFilters = [];
        arrFilters.push(search.createFilter({name: 'internalid', operator: 'is', values: [stOrderId]}));

        // Custom Search AMP EXTEND: Eligible Sales Order Details for Contract Creation MR 
        var arrSearchResults = util.search('transaction', 'customsearch_amp_extend_ex_serial_line', arrFilters);
        log.debug('Array of Results', arrSearchResults);

        var stSerialNumber = '';
        var stOrderSku = '';
        var flPurchasePrice = 0;

        // Loop through results and build context object containing all the necessary
        // data per line
        for(let i = 0; i < arrSearchResults.length; i++){

            var stItemType = arrSearchResults[i].getValue({name: 'type', join: 'item'});
            // Get the purchase price and serial number for the inventory item
            if(stItemType !== 'NonInvtPart'){
                var bIsWarranty = arrSearchResults[i].getValue({name: 'custitem_amp_is_warranty', join: 'item'});
                if(bIsWarranty){
                    stSerialNumber = arrSearchResults[i].getValue({name: 'serialnumbers', join: 'fulfillingTransaction'});
                    flPurchasePrice = arrSearchResults[i].getValue({name: 'amount'});
                    stOrderSku = arrSearchResults[i].getText({name: 'item'});
                }
                continue;
            }
            // Build context object
            var stOrderId = arrSearchResults[i].id;
            var stLineNumber = i;
            var objTranDate = arrSearchResults[i].getValue({name: 'trandate'});

            const stKey = `${stOrderId}_${stLineNumber}`;

            // If the order is stand alone, the order should have required columns populated
            // We should assess and convert these values
            stSerialNumber = stSerialNumber ? stSerialNumber : arrSearchResults[i].getValue({name: 'custcol_amp_ext_serial_number'});
            stOrderSku = stOrderSku ? stOrderSku : arrSearchResults[i].getValue({name: 'custcol_amp_ext_original_sku'});
            flPurchasePrice = flPurchasePrice ? flPurchasePrice : getSkuCost(stOrderSku);
            var stOgOrderNumber = arrSearchResults[i].getValue({name: 'custcol_amp_ext_warranty_order_num'});
            var stOrderNumber = stOgOrderNumber ? stOgOrderNumber : arrSearchResults[i].getValue({name: 'tranid'});
            var objOrigOrderDate = arrSearchResults[i].getValue({name: 'custcol_amp_ext_original_order_date'});
            objTranDate = objOrigOrderDate ? objOrigOrderDate : objTranDate;

            // Build details object using the orderId _ linenum as the key
            objResults[stKey] = {};
            objResults[stKey].id = stOrderId;
            objResults[stKey].line = stLineNumber;
            objResults[stKey].tran_date = objTranDate;
            objResults[stKey].purchase_price = flPurchasePrice;
            objResults[stKey].currency = getCurrencyCode(arrSearchResults[i].getValue({name: 'currency'}));
            objResults[stKey].order_number = arrSearchResults[i].getValue({name: 'tranid'});
            objResults[stKey].og_order_number = stOrderNumber;
            objResults[stKey].serial_number = stSerialNumber;
            objResults[stKey].extend_plan_id = arrSearchResults[i].getValue({name: 'custitem_amp_ext_plan_id', join: 'item'});
            objResults[stKey].extend_sku = stOrderSku 
            objResults[stKey].line_amount = arrSearchResults[i].getValue({name: 'amount'});
            objResults[stKey].total_amount = arrSearchResults[i].getValue({name: 'total'});
            objResults[stKey].name = arrSearchResults[i].getText({name: 'entity'}).replace(/[0-9]/g, '');
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
            
            // Clear globals for non standalone orders
            stSerialNumber = '';
            stOrderSku = '';
            flPurchasePrice = 0;
            
        }
    };
    // Get and return currency code
    const getCurrencyCode = currency => {
        var objCurrencyInfo = util.getCurrencyInfo();
        return objCurrencyInfo[currency].code;
    };
    // Build the Extend API JSON for contract creation
    const buildExtendJSON = objValues => {
        // Date is a string and we need to format for extend
        const stTranDate = new Date(objValues.tran_date);
        var objJSON = {
            'transactionId': objValues.id,
            'transactionDate': stTranDate.getTime() / 1000,
            'transactionTotal': objValues.total_amount.replace('.', ''),
            'currency' : objValues.currency,
            'poNumber': objValues.order_number,
            'customer': {
                'email': objValues.email,
                'name': objValues.name,
                'phone': objValues.phone,
                'billingAddress': {
                    'address1': objValues.bill_address,
                    'city': objValues.bill_city,
                    'provinceCode': objValues.bill_state,
                    'countryCode': objValues.bill_country,
                    'postalCode': objValues.bill_zip
                },
                'shippingAddress': {
                    'address1': objValues.ship_address,
                    'city': objValues.ship_city,
                    'provinceCode': objValues.ship_state,
                    'countryCode': objValues.ship_country,
                    'postalCode': objValues.ship_zip
                }
            },
            'product': {
                'referenceId': objValues.extend_sku,
                'purchasePrice': objValues.purchase_price.replace('.', ''),
                'serialNumber' : objValues.serial_number
            },
            'plan': {
                'purchasePrice': objValues.line_amount.replace('.', ''),
                'planId': objValues.extend_plan_id
            }
        };
        return objJSON;
    };
    // Update the warranty line with the appropriate required values for reporting
    const updateSalesOrder = (stOrderId, objValues, stContractId) => {
        try {
            var objSalesOrder = record.load({
                type: 'salesorder',
                id: stOrderId,
                isDynamic: true
            });
            log.debug('Line Number', objValues.line);
            objSalesOrder.selectLine({
                sublistId: 'item',
                line: objValues.line
            });
            // Write order id from response
            objSalesOrder.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'custcol_amp_ext_warranty_order_num',
                value: objValues.og_order_number
            });
            // Write contract id from response
            objSalesOrder.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'custcol_amp_ext_contract_id',
                value: stContractId
            });
            // Write serial number from the fufilled inventory item
            objSalesOrder.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'custcol_amp_ext_serial_number',
                value: objValues.serial_number
            });
            // Write sku from the fufilled inventory item
            objSalesOrder.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'custcol_amp_ext_original_sku',
                value: objValues.extend_sku
            });
            // Format the date for netsuite
            var objFormattedDate = format.parse({
                value: objValues.tran_date,
                type: format.Type.DATE
            });
            // Write date from order
            objSalesOrder.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'custcol_amp_ext_original_order_date',
                value: objFormattedDate
            });
            // Commit the selected sublist line
            objSalesOrder.commitLine({
                sublistId: 'item'
            });
            // Unflag the order to remove it from the contract creation queue
            objSalesOrder.setValue({
                fieldId: 'custbody_amp_ext_to_be_processed',
                value: false
            });
            // Save Order
            objSalesOrder.save();

        } catch(e){
            log.debug('REDUCE: Error Saving Order', e);
            log.debug('REDUCE: Error saving Sales Order Id ' + stOrderId, 'Extend Contract Id: ' + stContractId);
            // If by chance the sales order is not updated, flag the order to remove it from the queue
            // and avoid duplicate Extend contracts
            record.submitFields({
                type: 'salesorder',
                id: stOrderId,
                values: {
                    'custbody_amp_ext_to_be_processed' : false
                }
            });
        }
    };
    // Get the cost of the SKU via search as the SKU is a string ID
    const getSkuCost = (stOrderSku) => {
        log.debug('Sku Id', stOrderSku);
        var arrFilters = [];
        arrFilters.push(search.createFilter({name: 'itemid', operator: 'is', values: [stOrderSku]}));

        var arrColumns = [];
        arrColumns.push(search.createColumn({name: 'baseprice'}));

        var arrSearchResults = util.search('item', null, arrFilters, arrColumns);
        log.debug('Sku Results', arrSearchResults);
        var flPurchasePrice = 0.00;
        if(arrSearchResults.length > 0){
            flPurchasePrice = arrSearchResults[0].getValue({name: 'baseprice'});
        }

        return flPurchasePrice;
    };
    // Return mr functions
    return exports;
});