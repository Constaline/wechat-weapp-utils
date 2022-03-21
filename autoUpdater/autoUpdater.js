/**
 * 微信启动时自动升级
 *
 * 参考 https://developers.weixin.qq.com/miniprogram/dev/api/base/update/wx.getUpdateManager.html
 */

class autoUpdater {
	constructor() {
		this.updateManager = wx.getUpdateManager();
	}

	init() {
		// 获取小程序更新机制兼容
		if (wx.canIUse("getUpdateManager")) {
			//1. 检查小程序是否有新版本发布
			this.updateManager.onCheckForUpdate(res => {
				// 请求完新版本信息的回调
				if (res.hasUpdate) {
					//检测到新版本，需要更新，给出提示
					wx.showModal({
						title: "更新提示",
						content: "检测到新版本，下载新版本并重启小程序",
						showCancel: false,
						success: res => {
							//2. 用户确定下载更新小程序，小程序下载及更新静默进行
							this.downLoadAndUpdate();
						},
					});
				}
			});
		} else {
			// 如果希望用户在最新版本的客户端上体验您的小程序，可以这样子提示
			wx.showModal({
				title: "提示",
				content:
					"当前微信版本过低，无法使用该功能，请升级到最新微信版本后重试。",
				showCancel: false,
			});
		}
	}

	/**
	 * 下载小程序新版本并重启应用
	 */
	downLoadAndUpdate() {
		wx.showLoading();
		//静默下载更新小程序新版本
		this.updateManager.onUpdateReady(() => {
			wx.hideLoading();
			//新的版本已经下载好，调用 applyUpdate 应用新版本并重启
			this.updateManager.applyUpdate();
		});
		this.updateManager.onUpdateFailed(() => {
			wx.hideLoading();
			// 新的版本下载失败
			wx.showModal({
				title: "更新下载失败",
				content: "请您删除当前小程序，重新搜索打开。",
				showCancel: false,
			});
		});
	}
}

export default new autoUpdater();
