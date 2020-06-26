/**
 *@description: This script is triggered on creation of sales orders
 * via the UI or Ziftr cart, iterates through the lines and identifies
 * warranty items. If this is a warranty order then it is flagged to be
 * queued for Extend Contract creation via the AMP Extend - Create Contracts MR
 * mapreduce script.
 *    
 *@copyright Aimpoint Technology Services, LLC
 *@author Michael Draper
 * 
 *@NApiVersion 2.1
 *@NScriptType UserEventScript
 *@ModuleScope Public
 */
define([
    'N/search',
    'N/runtime',
    'N/record'
], 
(search, runtime, record) => {
    var exports = {};

    exports.beforeSubmit = context => {
        log.debug('BEFORESUBMIT: Execution Context', runtime.executionContext);
        
        // Only execute for orders created via userinterface and webservices
        if(['USERINTERFACE', 'WEBSERVICES'].indexOf(runtime.executionContext) == -1){
            return;
        }
        const objNewRecord = context.newRecord;
       
        try {
            const stItemLineCount = objNewRecord.getLineCount({sublistId: 'item'});
            objNewRecord.setValue({fieldId: 'custbody_amp_ext_to_be_processed', value: false});

            // Iterate through the lines to check if the inventory item is associated with a 
            // warranty item sku. If so, flag the order for contract creation and break

            for(let i = 0; i < stItemLineCount; i++){

                
                var arrFieldLookup = search.lookupFields({
                    type: 'item',
                    id: objNewRecord.getSublistValue({sublistId: 'item', fieldId: 'item', line: i}),
                    columns: ['type', 'custitem_amp_ext_inv_sku']
                });

                const stItemType = arrFieldLookup.type[0].value;

                if(stItemType === 'NonInvtPart'){

                    const arrSkuIds = arrFieldLookup.custitem_amp_ext_inv_sku;
                    const stContractId = objNewRecord.getSublistValue({sublistId: 'item', fieldId: 'custcol_amp_ext_contract_id', line: i}); 
                                        
                    if(arrSkuIds.length > 1 && !stContractId){   
                        log.debug('BEFORESUBMIT: Is a Warranty Order', objNewRecord.getSublistValue({sublistId: 'item', fieldId: 'item', line: i}));
                        objNewRecord.setValue({fieldId: 'custbody_amp_ext_to_be_processed', value: true});
                        break;
                    }
                }
                // if(stItemType === 'Kit' && objNewRecord.getValue({fieldId: 'custbody_amp_ext_to_be_processed'})){
                //     log.debug('BEFORESUBMIT: Is a Kit Order', objNewRecord.setValue({fieldId: 'custbody_amp_ext_kit_order', value: true}));

                // }
            }
        } catch(e) {
            log.debug('BEFORESUBMIT: Error Setting Extend Field for Job', JSON.stringify(e.message));
        }
    };
    exports.afterSubmit = context => {
        log.debug('AFTERSUBMIT: Execution Context', runtime.executionContext);
        
        // Only execute for orders created via webservices. These validations will be
        // prohibited via the user interface
        if([/*'USERINTERFACE',*/ 'WEBSERVICES'].indexOf(runtime.executionContext) == -1){
            return;
        }

        try {
            const objNewRecord = context.newRecord;
            // Check if the order was flagged as a warranty order beforeSubmit
            const bIsWarrantyOrder = objNewRecord.getValue({fieldId: 'custbody_amp_ext_to_be_processed'});
            
            // If this is not a warranty order, skip the line parsing logic
            log.debug('AFTERSUBMIT: Is a warranty Order? ', bIsWarrantyOrder);
            
            if(!bIsWarrantyOrder || bIsWarrantyOrder === 'F'){
                return;
            }
            // If this is a kit order we need to parse out warranty properly
            // if(bIsKitOrder){

            // }
            
            // Load record and get values
            var objSalesOrder = record.load({
                type: objNewRecord.type,
                id: objNewRecord.id
            });
            var stLineCount = objSalesOrder.getLineCount({sublistId: 'item'});
            var stSkuId = '';
            var stSkuCount = 0;
            var stWarrantyCount = 0;
            var stWarrantyLineCount = 0;
            var arrSkuLines = [];
            var arrWarrantyLines = []
            /*
                Loop through the line items to determine if the sales order lines
                are warranty lines with quanities > 1. Sum the quantities and compare
                to the overall count of warranty items to determine if any lines need
                to be parsed.
            */
            for(let i = 0; i < stLineCount; i++){
                // Get the item id
                var stItemId = objSalesOrder.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    line: i
                });
                // Look up if the item is configured to be offered 
                var arrFieldLookup = search.lookupFields({
                    type: 'item',
                    id: stItemId,
                    columns: ['custitem_amp_ext_inv_sku', 'custitem_amp_is_warranty', 'type']
                });
                const stItemType = arrFieldLookup.type[0].value;
                log.debug('Item type', stItemType);
                // Configured LIVE skus assigned to the warranty
                var arrLookupIds = arrFieldLookup.custitem_amp_ext_inv_sku;
                // Build an object from array for quick reference
                var objConfigSkus = {};
                if(arrLookupIds.length > 0){
                    for(var j = 0; j < arrLookupIds.length; j++){
                        objConfigSkus[arrLookupIds[j].value] = arrLookupIds[j].value;
                    }
                }
                // Warranty checkbox for inventory items covered by warranties
                const bIsWarranty = arrFieldLookup.custitem_amp_is_warranty;
                // This is a LIVE inv item that has warranty offers
                if(bIsWarranty){

                    stSkuId = stItemId;
                    var stQuant = objSalesOrder.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'quantity',
                        line: i
                    });
                    // If the item quantity is > 1, get the count and push the index
                    // into the arrary of index
                    if(stQuant > 1){
                        // Do not execute for warranty inv skus that are on the last line.
                        // These are not warrantied items
                        if(i + 1 < stLineCount){
                            var index = arrSkuLines.indexOf(i - 1);
                            // If the previous item was an inventory item, it does not a 
                            // warrantied item so, remove its index from the array of indexes
                            if(index > -1){
                                stSkuCount = stSkuCount - objSalesOrder.getSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'quantity',
                                    line: i - 1
                                });
                                arrSkuLines.splice(index, 1);
                            }
                            arrSkuLines.push(i);
                            // Up the inv SKU quantity
                            stSkuCount += stQuant;
                            // Up the overall warranty count number
                            stWarrantyLineCount++;
                        }
                    }
                // This is a warranty item assigned to LIVE skus
                } else if(arrLookupIds.length > 1){

                    var stQuant = objSalesOrder.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'quantity',
                        line: i
                    });
                    // If the item quantity is > 1, get the count and push the index
                    // into the arrary of index
                    if(stQuant > 1){
                        arrWarrantyLines.push(i);
                        // If it there is an inv sku on the order, see if its convered by this warranty
                        // if not, dont add to the warranty sku count
                        if(stSkuId){
                            stWarrantyCount += objConfigSkus[stSkuId] ?  stQuant : 0;
                        } else {
                            // Just add the warranty sku count for stand alone orders
                            stWarrantyCount += stQuant;
                        }
                        // Up the over warranty count number
                        stWarrantyLineCount++;
                    }
                    // Clear global for preceding inv skus
                    stSkuId = '';
                    
                }
            }
            // Print counts for debugging
            log.debug(
                'AFTERSUBMIT: Counts', 
                'Line: ' 
                + stWarrantyLineCount 
                + ', Sku: ' 
                + stSkuCount 
                + ', warranty: ' 
                + stWarrantyCount
                + ', Sku Line Array: '
                + JSON.stringify(arrSkuLines)
                + ', Warranty Line Array: '
                + JSON.stringify(arrWarrantyLines)
            );
            //Run Line Validations
            var stWarrantyId = '';
            var stInvItemId = '';
            // If the total sku count is not equal to the count for warranty lines, we need to split
            // out the lines with quantities > 1
            if((stSkuCount + stWarrantyCount) != stWarrantyLineCount){
                //Need to split out 
                log.debug('AFTERSUBMIT: ', 'We need to split as this order has quantities > 1 for warranty items.');
                // Iterate through lines and check if the line index exists
                // in the arr of indexes marking lines with quant > 1
                for(let i = 0; i < stLineCount; i++){
                    // If index found, its an inv sku that should be updated
                    if(arrSkuLines.indexOf(i) > -1){
                        //edit quantity to 1
                        stInvItemId = objSalesOrder.getSublistValue({
                            sublistId: 'item',
                            fieldId: 'item',
                            line: i
                        });
                        log.debug('AFTERSUBMIT: Inv Item Id', stInvItemId);
                        objSalesOrder.setSublistValue({
                            sublistId: 'item',
                            fieldId: 'quantity',
                            line: i,
                            value: 1
                        });
                        stSkuCount--;
                    }
                    // If index found, its wrranty sku that should be updated
                    else if(arrWarrantyLines.indexOf(i) > -1){
                        //edit quantity to 1
                        stWarrantyId = objSalesOrder.getSublistValue({
                            sublistId: 'item',
                            fieldId: 'item',
                            line: i
                        });
                        log.debug('AFTERSUBMIT: Warranty Id', stWarrantyId);

                        objSalesOrder.setSublistValue({
                            sublistId: 'item',
                            fieldId: 'quantity',
                            value: 1,
                            line: i
                        });
                        stWarrantyCount--;
                    }
                    
                }
                log.debug('AFTERSUBMIT: New Sku Count', stSkuCount);
                log.debug('AFTERSUBMIT: New Warranty Count', stWarrantyCount);
                
            }
            var bSalesOrderSave = false;
            // If there are warranties and skus with quants > 2
            // we need to create a line for the sku then for the warranty
            if(arrWarrantyLines.length > 0 && arrSkuLines.length > 0){
                bSalesOrderSave = true;
                for(let i = 0; i < stWarrantyCount; i++){
                    log.debug('AFTERSUBMIT: Add line for ', stInvItemId);
                    objSalesOrder.insertLine({
                        sublistId: 'item',
                        line: stLineCount
                    });
                    objSalesOrder.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'item',
                        line: stLineCount,
                        value: stInvItemId
                    });
                    log.debug('AFTERSUBMIT: Add line for warranty', stWarrantyId);
                    
                    stLineCount++;

                    objSalesOrder.insertLine({
                        sublistId: 'item',
                        line: stLineCount
                    });
                    objSalesOrder.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'item',
                        line: stLineCount,
                        value: stWarrantyId
                    });
                    stSkuCount--;
                    stWarrantyCount--;
                }
                log.debug('AFTERSUBMIT: New Line Count', stLineCount);
        
            }
            // If their are warranties with > 1 quants but not Skus
            // we need to create a new line for the warranty
            else if(arrWarrantyLines.length > 0 && arrSkuLines.length == 0){
                bSalesOrderSave = true;
                for(let i = 0; i < stWarrantyCount; i++){
                    log.debug('AFTERSUBMIT: Add Stand Alone Warranty line for ', stInvItemId);
                    objSalesOrder.insertLine({
                        sublistId: 'item',
                        line: stLineCount
                    });
                    objSalesOrder.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'item',
                        line: stLineCount,
                        value: stWarrantyId
                    });
                    stWarrantyCount--;
                }
                log.debug('AFTERSUBMIT: Add standalone line for warranty', stWarrantyId);
            }            
            // If line insert updates are made to the line, save the sales order
            if(bSalesOrderSave){
                log.debug('AFTERSUBMIT: Saving Record');
                objSalesOrder.save();
            }

        } catch(e){
            log.debug('AFTERSUBMIT: Error creating SO', e);
        }
    };
    return exports;
});