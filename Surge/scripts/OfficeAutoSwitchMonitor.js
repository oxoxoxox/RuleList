const modulenName = "OfficeAutoSwitch";
const ssidList = ["ThunderSoft-Office", "ThunderSoft-Guest"];

var module_enabled = false;
// var officeUrlString = 'http://10.0.232.2/html/';
var officeUrlString = 'http://i.thundersoft.com/';

const getModuleStatus = new Promise((resolve) => {
    $httpAPI("GET", "v1/modules", null, (data) =>
        resolve(data.enabled.includes(modulenName))
    );
});

getModuleStatus.then((enabled) => {
    console.log(`module enabled: [${enabled ? "true" : "false"}]`);
    module_enabled = enabled;

    console.log($network);

    let ip4addr = (typeof $network.v4 != 'undefined')
                    && (typeof $network.v4.primaryAddress != 'undefined') ? $network.v4.primaryAddress : '';
    let ip6addr = (typeof $network.v6 != 'undefined')
                    && (typeof $network.v6.primaryAddress != 'undefined') ? $network.v6.primaryAddress : '';
    console.log(`network.ipv4: [${ip4addr}]`);
    console.log(`network.ipv6: [${ip6addr}]`);

    if (checkOfficeWiFi()) {
        enableModule(true);
    } else {
        checkOfficeLan();
    }
});

function checkOfficeWiFi() {
    console.log(`公司WiFi检测中...`);

    let office_wifi = ssidList.indexOf($network.wifi.ssid) > -1;
    console.log(`公司WiFi检测${office_wifi ? "成功" : "失败"}`);
    return office_wifi;
}

function checkOfficeLan() {
    console.log(`公司局域网检测中...`);

    const officeUrl = {
        url: officeUrlString,
        method: 'GET',
        timeout: 5,
    };

    let attemptCount = 0;
    const maxAttempts = 3;

    function attemptCheck() {
        attemptCount++;
        console.log(`第${attemptCount}次检测`);

        $httpClient.get(officeUrl, (err, response, body) => {
            let status = (response != null) ? response.status : 'null';
            let length = (body != null) ? body.length : 'null';
            console.log(`response.status: [${status}], err: [${err}], body.length: [${length}]`)

            if (err) {
                console.log(`公司局域网检测失败，${err}`);
                // Retry immediately if attempts remain
                if (attemptCount < maxAttempts) {
                    console.log(`等待 1 秒后重试...`);
                    setTimeout(attemptCheck, 1000);
                } else {
                    console.log(`公司局域网检测失败，达到最大重试次数`);
                    enableModule(false);
                    $done();
                }
            } else {
                if (status === 403) {
                    console.log(`公司局域网检测失败，${status}`);
                    // Retry immediately if attempts remain
                    if (attemptCount < maxAttempts) {
                        console.log(`等待 1 秒后重试...`);
                        setTimeout(attemptCheck, 1000);
                    } else {
                        console.log(`公司局域网检测失败，达到最大重试次数`);
                        enableModule(false);
                        $done();
                    }
                } else {
                    console.log(`公司局域网检测成功`);
                    enableModule(true);
                    $done();
                }
            }
        });
    }

    // Start first attempt
    attemptCheck();
}

function enableModule(need_on) {
    console.log(`module_enabled: [${module_enabled}], need_on: [${need_on}]`);

    if (need_on && !module_enabled) {
        //接入公司网络，目前未开启模块 => 开启
        console.log(`公司网络，开启${modulenName}模块`);
        $notification.post("Event", `公司网络，开启${modulenName}模块`, "");

        $httpAPI("POST", "v1/modules", { [modulenName]: true }, () => $done());
    } else if (!need_on && module_enabled) {
        //没有接入公司网络，已经开启了模块 => 关闭
        console.log(`非公司网络，关闭${modulenName}模块`);
        $notification.post("Event", `非公司网络，关闭${modulenName}模块`, "");

        $httpAPI("POST", "v1/modules", { [modulenName]: false }, () => $done());
    } else {
        //其他情况 => 重复触发 => 结束脚本
        console.log(`重复触发，结束脚本`);
        // $notification.post("重复触发", "", "");
    }
    $done();
}
