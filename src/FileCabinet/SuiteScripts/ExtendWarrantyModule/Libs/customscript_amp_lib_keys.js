/**
 * keyconfig
 * @NApiVersion 2.1
 */
define([
    'N/runtime'
],
(runtime) => {
    const objSandbox = {
        storeId: '3cbac81b-4354-40e9-8506-70d02a00ebd9',
        key : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImpvZStzb2NsZWFuQGV4dGVuZC5jb20iLCJhY2NvdW50SWQiOiJhY2RmYzU4MS1jN2JmLTQ0YmMtOGNlYi1jMmJhMTM4NzA4MDAiLCJhZG1pbiI6ZmFsc2UsInNjb3BlIjoiYWxsIiwiaWF0IjoxNTcwNTY5NDc0LCJleHAiOjI1NDk3Mjg3MDI3MywiaXNzIjoiYXBpLmhlbGxvZXh0ZW5kLmNvbSIsInN1YiI6IjVjYzQ4ZWY0LWQ1YjUtNDVhZS1iNjFlLTFkYjVlMDU5YWY4MSJ9.vAfzKaCKKOPuob_K4FfPS3krRrT_ouALR17AFVH1lUM',
        domain: 'https://api-demo.helloextend.com',
        email: 'clampron@soclean.com' //SB requires manual assignment of email. Currently Curt Lampron - Director Business Systems
    };
    const objProd = {
        storeId: '1db3230b-662c-4aee-a296-c7b07ff2d354',
        key : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImpvZStzb2NsZWFuQGV4dGVuZC5jb20iLCJhY2NvdW50SWQiOiI3OTA4ZWNkNi0zNWYzLTRhNTgtYWVlZC1hMDJmZTQxMTkzOTQiLCJhY3RpdmF0ZWRBdCI6MTU5MzcxNzY4NzMxNywic2NvcGUiOiJhbGwiLCJpYXQiOjE1OTM3MTc3NTQsImV4cCI6MjU0OTk2MDE4NTUzLCJpc3MiOiJhcGkuaGVsbG9leHRlbmQuY29tIiwic3ViIjoiMzlkNzFiNjEtN2M2Zi00MjZlLTkzMWYtYWJmMmNiYmQwNjRiIiwianRpIjoiZjc2ODBlZmUtNWEzZi00MzJiLWFhODktYmJiNjIzN2VmMTI5In0.cNuFWIpLIy4mVkkmTahHLVHJwsOo5pB19Kmz2ZLqInE',
        domain: 'https://api.helloextend.com'
    };

    var objKeys = {};

    objKeys['SANDBOX'] = objSandbox;
    objKeys['PRODUCTION'] = objProd;
    
    return objKeys[runtime.envType];
});