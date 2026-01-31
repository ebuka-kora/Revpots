import { ActivityIndicator, Image, ImageBackground, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

type LoadingScreenProps = {
  message?: string;
};

export function LoadingScreen({ message = 'Preparing your app...' }: LoadingScreenProps) {
  return (
    <ImageBackground
      source={require('../assets/images/omyre1.png')}
      style={styles.background}
      imageStyle={styles.backgroundImage}
      resizeMode="contain"
    >
    <Animated.View
      entering={FadeIn.duration(300)}
      style={styles.container}
    >
      <View style={styles.content}>
        <View style={styles.logoWrap}>
          <Image
            source={require('../assets/images/splash-icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.title}>RevPilot</Text>
        <Text style={styles.subtitle}>Sales & Invoices</Text>
        <ActivityIndicator
          size="large"
          color="#6c94d6"
          style={styles.spinner}
        />
        <Text style={styles.message}>{message}</Text>
      </View>
    </Animated.View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: '#f6b9fa',
    width: '100%',
    height: '100%',
  },
  backgroundImage: {
    opacity: 0.8,
    position: 'absolute',
    bottom: 0,
    // left: '5%',
    right: '5%',
    width: '105%',
    height: '110%',
    alignSelf: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logoWrap: {
    width: 120,
    height: 120,
    marginBottom: 16,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2f2f3a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  logo: {
    width: 80,
    height: 80,
  },
  title: {
    fontFamily: 'Merriweather',
    fontSize: 28,
    fontWeight: '700',
    color: '#2f2f3a',
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: 'Merriweather',
    fontSize: 15,
    color: '#6b6b7b',
    marginBottom: 28,
  },
  spinner: {
    marginBottom: 12,
  },
  message: {
    fontSize: 14,
    color: '#8a8a9a',
  },
});
