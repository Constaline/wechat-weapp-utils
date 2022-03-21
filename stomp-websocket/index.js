const Stomp = require('./stomp.js').Stomp;

// stomp.js源码使用windows.setInterval设置定时器发送心跳包，小程序没有windows对象但有setInterval接口，在连接前设置
Stomp.setInterval = function(interval, f) { return setInterval(f, interval); }; 
Stomp.clearInterval = function(id) { return clearInterval(id); };

// 重连间隔
const RECONNECT_DELAY = 5000;
// 心跳包间隔
const HEARTBEAT_DELAY = 10000;

class websocketClient {
 /**
   * @param {String} websocketUrl: 消息通知地址
   * @param {String} queue: 队列名称
   * @param {String} username: 登录帐号
   * @param {String} password: 登录密码
   * @param {Boolean} debugMode: 调试模式
   * @param {Function} subscribeCallBack(msg):订阅消息回调
   * @param {Function} errorCallback(): 错误回调
   */
    constructor({
        websocketUrl,
        queue,
        username,
        password,
        debugMode,
        subscribeCallBack,
        errorCallback,
    }) {
        this.stompClient = null;
        this.websocketUrl = websocketUrl;
        this.queue = queue;
        this.username = username;
        this.password = password;
        this.debugMode = debugMode || false;  //调试模式
        this.subscribeCallBack = subscribeCallBack; //订阅消息回调
        this.errorCallback = errorCallback; // 错误回调
    }

    createWs() {
        let _this = this;
        let socketMsgQueue = []
    
        return function () {
            let socketOpen = false
            let socketTask
        
            function send(msg) {
                if (socketOpen) {
                    socketTask.send({
                        data: msg
                    })
                } else {
                    socketMsgQueue.push(msg)
                }
            }
        
            const ws = {
                send,
                onopen: null,
                onmessage: null,
                close: () => socketTask.close()
            }
        
            socketTask = wx.connectSocket({
                url: _this.websocketUrl,
                success: () => console.log('wx_stompws success'),
                fail: () => console.log('wx_stompws fail'),
                complete: () => console.log('wx_stompws complete')
            })
            
            socketTask.onOpen(res => {
                console.log('wx_stompws socket opened')

                ws.onopen && ws.onopen()

                socketOpen = true
                for (var i = 0; i < socketMsgQueue.length; i++) {
                    send(socketMsgQueue[i])
                }
                socketMsgQueue = []
            })
            
            socketTask.onMessage(res => {
                // console.log('onmessage', res)

                ws.onmessage && ws.onmessage(res)
            })
            
            // 之前没有处理断开的情况
            socketTask.onClose(res => {
                console.log('wx_stompws socket closed', res)
                socketOpen = false

                ws.onclose && ws.onclose()
            })

            socketTask.onError(err => console.log('wx_stompws socket error', err))
        
            return ws
        }
    }

    connect() {
        this.stompClient = Stomp.over(this.createWs())
        this.stompClient.debug = (str) => {
            if(this.debugMode){
                console.log('wx_stompws debug: ' + str)
            }
        }
        // 每个重连间隔检测一次是否断开，如果断开了就自动重连
        this.stompClient.reconnect_delay = RECONNECT_DELAY;
        this.stompClient.heartbeat.outgoing = HEARTBEAT_DELAY;  //发心跳间隔
        this.stompClient.heartbeat.incoming = HEARTBEAT_DELAY;  //收心跳间隔

        
        this.stompClient.connect(
            this.username,
            this.password,
            (sessionId) => {
                console.log('wx_stompws sessionId', sessionId)
                
                this.subscribe();
            },
            (error) => {
                this.errorCallback(error);
            },
        );

        
    }


    // 订阅
    subscribe() {
        let headers = { 'ack': 'client' }; 

        this.stompClient.subscribe(
            this.queue,
            (msg) => {
                console.log('wx_stompws from mq:', msg);
                this.subscribeCallBack(msg);
                msg.ack();
            },
            headers
        );
    };


    // 断开连接
    disconnect() {
        this.stompClient.unsubscribe();
        this.stompClient.disconnect();
    }
}

export default websocketClient;