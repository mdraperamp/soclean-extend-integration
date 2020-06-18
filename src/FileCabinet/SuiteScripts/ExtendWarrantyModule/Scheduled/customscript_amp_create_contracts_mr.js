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
 */
define([
    'N/runtime',
    '../Libs/customscript_amp_util',
    '../Libs/customscript_amp_item_api'
], 
(runtime, util, api) => {
    var exports = {};
    exports.getInputData = context => {
        try {
            //Get all sales orders that are in need of Extend contract
            var arrOrders = [];
            const objSearch = search.load({ 
                id: 'customsearch_amp_items_ready_for_sync'
            });
            objSearch.run().each(result => {
                var stOrderId = result.getValue(result.columns[0]);
                arrOrders.push(stOrderId);
            });
            //Create filters and columns
            var arrFilters = [];
            arrFilters.push(search.createFilter({name: 'internalid', operator: 'anyof', values: arrOrders}));
            //Search 
            var arrSearchResults = util.search('transaction', 'customsearch_amp_extend_ex_serial_line', arrFilters);

            var objResults = {};
            for(let i = 0; i < arrSearchResults.length; i++){
                var stSerialNumber = '';
                var stItemType = arrSearchResults[i].getValue({name: 'type'});
                if(stItemType != 'noninventoryitem'){
                    stSerialNumber = arrSearchResults[i].getValue({name: 'serialnumber'});
                    continue;
                }
                var stOrderId = arrSearchResults[i].id;
                objResults[stOrderId].custcol_amp_extend_serial_number = stSerialNumber;
                objResults[stOrderId].custcol_amp_extend_plan_id = arrSearchResults[i].getValue({name: 'custcol_amp_extend_plan_id'});
                objResults[stOrderId].custcol_amp_extend_item_sku = arrSearchResults[i].getValue({name: 'custcol_amp_extend_item_sku'});
                objResults[stOrderId].amount = arrSearchResults[i].getValue({name: 'amount'});

            }
            return objResults;

        } catch(e){

            log.debug('ERROR in getInputData', e.message);
        }
    };
    exports.map = context => {

    };
    exports.reduce = context => {

    };
    exports.summarize = summary => {

    };
    return exports;
});