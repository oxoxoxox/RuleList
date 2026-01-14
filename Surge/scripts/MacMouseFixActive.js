let url = $request.url;
if (url.indexOf('api.gumroad.com/v2/licenses/verify') != -1) {
    let body = JSON.parse($response.body);
    body.success = true;
    body.uses = 1;
    body.message = "Active success.";
    body = JSON.stringify(body);
    $done({body});
} else {
    $done({});
}
