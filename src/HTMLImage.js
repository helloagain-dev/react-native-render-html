import React, { PureComponent } from 'react';
import { Image, View, Text } from 'react-native';
import PropTypes from 'prop-types';

export default class HTMLImage extends PureComponent {
    constructor (props) {
        super(props);
        this.state = {
            width: props.imagesInitialDimensions.width,
            height: props.imagesInitialDimensions.height,

            /**
             * We have the issue when image gets blurry on iOS devices (on Android not detected).
             * To fix the issue, we want to skip rendering of Image component on the first render cycle. This is
             * because react-native Image component sometimes don't reaload image. This issue is related to 
             * https://github.com/facebook/react-native/pull/23641 and can probably be fixed when 
             * react-native version is upgraded.
             * 
             * We have added imageLoaded which will prevent rendering of Image component until we get
             * correct image dimensions.
             */
            imageLoaded: false
        };
    }

    static propTypes = {
        source: PropTypes.object.isRequired,
        alt: PropTypes.string,
        height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        style: Image.propTypes.style,
        imagesMaxWidth: PropTypes.number,
        imagesInitialDimensions: PropTypes.shape({
            width: PropTypes.number,
            height: PropTypes.number
        })
    }

    static defaultProps = {
        imagesInitialDimensions: {
            width: 100,
            height: 100
        }
    }

    componentDidMount () {
        this.getImageSize();
        this.mounted = true;
    }

    componentWillUnmount () {
        this.mounted = false;
    }

    componentDidUpdate(prevProps, prevState) {
        this.getImageSize(this.props);
    }

    getDimensionsFromStyle (style, height, width) {
        let styleWidth;
        let styleHeight;

        if (height) {
            styleHeight = height;
        }
        if (width) {
            styleWidth = width;
        }
        if (Array.isArray(style)) {
            style.forEach((styles) => {
                if (!width && styles['width']) {
                    styleWidth = styles['width'];
                }
                if (!height && styles['height']) {
                    styleHeight = styles['height'];
                }
            });
        } else {
            if (!width && style['width']) {
                styleWidth = style['width'];
            }
            if (!height && style['height']) {
                styleHeight = style['height'];
            }
        }

        return { styleWidth, styleHeight };
    }

    getImageSize (props = this.props) {
        const { source, imagesMaxWidth, style, height, width } = props;
        const { styleWidth, styleHeight } = this.getDimensionsFromStyle(style, height, width);

        if (styleWidth && styleHeight) {
            return this.mounted && this.setState({
                width: typeof styleWidth === 'string' && styleWidth.search('%') !== -1 ? styleWidth : parseInt(styleWidth, 10),
                height: typeof styleHeight === 'string' && styleHeight.search('%') !== -1 ? styleHeight : parseInt(styleHeight, 10)
            });
        }
        // Fetch image dimensions only if they aren't supplied or if with or height is missing
        Image.getSize(
            source.uri,
            (originalWidth, originalHeight) => {
                if (!imagesMaxWidth) {
                    return this.mounted && this.setState({ width: originalWidth, height: originalHeight });
                }
                const optimalWidth = imagesMaxWidth <= originalWidth ? imagesMaxWidth : originalWidth;
                const optimalHeight =  (optimalWidth * originalHeight) / originalWidth;
                
                this.mounted && this.setState({ width: optimalWidth, height: optimalHeight, imageLoaded: true, error: false });
            },
            () => {
                // If we can't get Image.getSize, default to a square image with width and height set to imagesMaxWidth.
                // The reason is that when loading a lot of Images on the same time on android, Image.getSize
                // failes on some of them and then the images are not shown. This was experienced in the myshoes app on the
                // PageScreen with a lot (>20) images.
                this.mounted && this.setState({ width: imagesMaxWidth, height: imagesMaxWidth, imageLoaded: true, error: false });
            }
        );
    }

    validImage (source, style, props = {}) {
        return (
            <Image
              source={source}
              style={[{ width: this.state.width, height: this.state.height, resizeMode: 'cover' }, style]}
              {...props}
            />
        );
    }

    get errorImage () {
        return (
            <View style={{ width: 50, height: 50, borderWidth: 1, borderColor: 'lightgray', overflow: 'hidden', justifyContent: 'center' }}>
                { this.props.alt ? <Text style={{ textAlign: 'center', fontStyle: 'italic' }}>{ this.props.alt }</Text> : false }
            </View>
        );
    }

    render () {
        const { source, style, passProps } = this.props;

        // Show image when we know correct dimensions
        if(this.state.imageLoaded) {
            return this.validImage(source, style, passProps);
        }
        else {
            return null;
        }
    }
}
