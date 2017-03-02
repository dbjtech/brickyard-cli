import rn from 'react-native'

if (rn.Platform.OS === 'web') {
	console.log(rn)
	rn.Keyboard = {
		addListener: () => {
			console.log('hack Keyboard.addListener')
			return {
				remove: () => console.log('hack Keyboard.addListener(...).remove()')
			}
		}
	}
	// rn.NativeModule = {}
	// rn.NativeModule.UIManager = {
	// 	measure: () => {
	// 		console.log('hack NativeModule.UIManager')
	// 	}
	// }
}
