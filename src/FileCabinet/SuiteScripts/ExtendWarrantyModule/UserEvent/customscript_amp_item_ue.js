/**
 *@description: 
 *  Item User Event script that handles NS item syncing with Extend products
 *  and warranty plans. 
 * 
 *@copyright Aimpoint Technology Services, LLC
 *@author Michael Draper
 * 
 *@NApiVersion 2.1
 *@NScriptType UserEventScript
 *@ModuleScope Public
 */
 define([
    '../Libs/customscript_amp_item_api'
 ], 
(api) => {
    let stLogTitle;
    
    const exports = {};
    const objStatus = {
        'NEW' : 1,
        'UPDATING' : 2,
        'LIVE' : 3,
        'INACTIVE' : 4
    };
    /**
     * Before Load
     * Add 'Sync Plan' button to the Item Record
     * This button will call a backend suitelet that will trigger
     * the Create Plans Scheduled Script and update the Item Record 
     * to 'updating' status
     */
    exports.beforeLoad = context => {
        // stLogTitle = 'BEFORE LOAD';
        // //Get record object
        // let objNewRecord = context.newRecord;
        // const stSyncStaus = objNewRecord.getValue({fieldId: 'custitem_amp_sync_status'});
        // const bIsWarrantyItem = objNewRecord.getValue({fieldId: 'custitem_amp_is_warranty'});

        // if(context.type === 'edit' && bIsWarrantyItem && stSyncStaus === 'live') {
        //     //Get form object to add button
        //     const objForm = context.form;
        //     //Build suitelet URL
        //     var stUpdatePlansURL = url.resolveScript({
        //         scriptId: 'customscript_amp_trigger_update',
        //         deploymentId: 'customdeploy_amp_trigger_update',
        //         params: { 'recordId': objNewRecord.id }
        //     });
        //     //Adding button to form with simple window confirmation prompt
        //     objForm.addButton({
        //         id: 'custpage_amp_trigger_update',
        //         label: 'Sync',
        //         functionName: 'if(confirm(\'You are about to call Extends API and update this item? \n\nAre you sure you want to update this item?\')) window.open(\'' + stUpdatePlansURL + '\', \'_self\')'
        //     });
        // }
    };
    /**
     * Before Submit
     * After the record is created the script will
     * create the product via the Extend create api
     */
    exports.beforeSubmit = context => {
        stLogTitle = 'BEFORE SUBMIT';

        let objNewRecord = context.newRecord;
        const bIsWarrantyItem = objNewRecord.getValue({fieldId: 'custitem_amp_is_warranty'});

        //Only trigger the api call on create
        if(bIsWarrantyItem){

            switch (context.type){
                case 'edit':
                    const objProductDetails = productDetails(objNewRecord);
                    //Call API
                    log.debug("Update Product Details", JSON.stringify(objProductDetails));
                    const bProdUpdated = api.updateProduct(objProductDetails);
                    // const bProdUpdated = true;
                    //If successful, update status to updating. This will indicate inclusion in batch jobs
                    if(bProdUpdated) {
                        log.debug(`Updating Sync Status to .. ${objStatus.UPDATING}`, "-");
                        objNewRecord.setValue({fieldId: 'custitem_amp_sync_status', value: objStatus.UPDATING});
                    }
                    break;

                default:
                    return;
            }
        }
    };
    /**
     * After Submit
     */
    exports.afterSubmit = context => {
        stLogTitle = 'AFTER SUBMIT';

        let objNewRecord = context.newRecord;
        const bIsWarrantyItem = objNewRecord.getValue({fieldId: 'custitem_amp_is_warranty'});

        //Only trigger the api call on create
        if(bIsWarrantyItem){
            switch (context.type){
                case 'create':
                    const objProductDetails = productDetails(objNewRecord);
                    //Call API
                    log.debug("Create Product Details", JSON.stringify(objNewRecord));
                    const bProdCreated = api.createProduct(objProductDetails);
                    // const bProdCreated = true;
                    //If successful, update status to updating. This will indicate inclusion in batch jobs
                    if(bProdCreated) {
                        log.debug(`Updating Sync Status to .. ${objStatus.UPDATING}`, "-");
                        var objNewItem = record.load({
                            type: objNewRecord.type,
                            id: objNewRecord.id,
                            isDynamic: true
                        });
                        objNewItem.setValue({fieldId: 'custitem_amp_sync_status', value: objStatus.UPDATING});
                        objNewItem.save();
                    }
                    break;

                default:
                    return;
            }
        }
    };
    const productDetails = (objNewRecord) => {
       return {
            "brand" : "soclean",
            "description" : objNewRecord.getValue({fieldId: 'salesdescription'}),
            "mfrWarranty" : {
                "parts" : warrantyTerms(objNewRecord),
                "labor" : warrantyTerms(objNewRecord),
            },
            "price" : objNewRecord.getSublistValue({
                sublistId: "price1",
                fieldId: "price_1_",
                line: 0
            }),
            "title" : objNewRecord.getValue({fieldId: 'salesdescription'}),
            "referenceId" : JSON.stringify(objNewRecord.id),
            "identifiers" : {
                "sku" : objNewRecord.getValue({fieldId: 'itemid'}),
                "upc" : objNewRecord.getValue({fieldId: 'upccode'}),
            }
        };
    };
    const warrantyTerms = (objNewRecord) => {
        const intWarrantyTerms = parseInt(objNewRecord.getText({fieldId: "custitem_wrm_item_warrantyterms"}));
        var intMonths = "";
        switch(intWarrantyTerms){
            case 1:
                intMonths = 12
                break;
            case 2:
                intMonths = 24
                break;
            case 3:
                intMonths = 36
                break;
            default:
                return intMonths;
        }
        return intMonths;
    };

    return exports;
});