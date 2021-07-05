import React, { Component } from 'react';
import { View, PanResponder, Animated, StyleSheet } from 'react-native';
import Svg from 'react-native-svg';
import { calcMul90,rotatedDim } from 'react-native-svg-pan-zoom/util';
import { createIdentityMatrix } from 'react-native/Libraries/Utilities/MatrixMath';
const SvgView = Svg;
import { createIdentityTransform, calcDistance, calcCenter, createScalingMatrix, createTranslationMatrix, viewTransformMult, getBoundedPinchTransform, getBoundedTouchTransform } from './util';
/*********************************************************
 * Component
 *********************************************************/

export default class SvgPanZoom extends Component {
    // Lifecycle methods
    constructor(props) {
        super(props);
        this.dropNextEvt = 0;
        // auto zoom and rotate values
        this.zoomPoint={
            x:0,
            y:0,
            angle:0,
            scale:1
        }
        this.lastRotation=0
        this.initialTouches
        this._rotate= new Animated.Value(0)
        this._rotateStr = this._rotate.interpolate({
            inputRange: [-100, 100],
            outputRange: ['-100rad', '100rad'],
          });
    
        // Utils
        this._onLayout = (event) => {
            this.mainViewRef.measure((x, y, w, h, pageX, pageY) => {
                this.setState({
                    viewDimensions: {
                        height: h,
                        width: w,
                        pageX: pageX,
                        pageY: pageY,
                    },
                    layoutKnown: true,
                });
            });
        };
        this.rotateLeft=(a)=>{
            let theta=this.lastRotation+a
            const {x,y,scale}=this.zoomPoint
            this.zoomToPoint(x,y,scale,1000,theta,false)
        }
        this.rotateRight=(a)=>{
            let theta=this.lastRotation-a
            const {x,y,scale}=this.zoomPoint
            this.zoomToPoint(x,y,scale,1000,theta,false)
        }
        this.lasSliderRotate=0
        this.slidRotate=(a)=>{
            let theta=(a-this.lastRotation)
            const {x,y,scale}=this.zoomPoint
            const {canvasWidth,canvasHeight}=this.props
            console.log({x,y})
            let origin={
                x:x,
                y:y
            }
            let xx=origin.x+canvasWidth/2
            let yy=origin.y+canvasHeight/2
            const rotatedPoint=rotate_point(xx,yy,origin.x,origin.y,theta)
            const viewTransform={
                scaleX:scale,
                scaleY:scale,
                translateX:rotatedPoint.x,
                translateY:rotatedPoint.y,
            }
            Animated.parallel([
                Animated.timing(this.state.TranslationAnimation, {
                    toValue: { x: viewTransform.translateX, y: viewTransform.translateY },
                    duration:0,
                    useNativeDriver: true
                }),
                Animated.timing(this._rotate, {
                    toValue: theta*Math.PI/180,
                    duration:0,
                    useNativeDriver: true
                }),
            ]).start();
        }
        this.pinchZoom=(x, y, scale,angle)=>{
            this.zoomToPoint(x,y,scale,0,angle)
        }
        this.zoomToPoint = (x, y, scale, duration = 1000,angle,isDefault=true) => {
            console.log({x,y})
            if(isDefault){angle=calcMul90(angle)}
            // saving values for later use for button rotations
            this.lastRotation=angle
            this.zoomPoint.x=x
            this.zoomPoint.y=y
            this.angle=angle
            const { canvasHeight, canvasWidth } = this.props;
            let centX=(canvasWidth/2)-x
            let centY=(canvasHeight/2)-y
            const viewTransform = {
                scaleX: scale,
                scaleY: scale,
                skewX: 0,
                skewY: 0,
                translateX: centX*scale,
                translateY: centY*scale
            };

            this.setState({before:{x:viewTransform.translateX,y:viewTransform.translateY}})
            let angRad=angle*Math.PI/180
            let xx=Math.cos(angRad) * viewTransform.translateX - Math.sin(angRad) * viewTransform.translateY
            let yy=Math.sin(angRad) * viewTransform.translateX + Math.cos(angRad) * viewTransform.translateY
            viewTransform.translateX=xx
            viewTransform.translateY=yy

            Animated.parallel([
                Animated.timing(this.state.TranslationAnimation, {
                    toValue: { x: viewTransform.translateX, y: viewTransform.translateY },
                    duration:duration,
                    useNativeDriver: true
                }),
                Animated.timing(this._rotate, {
                    toValue: angRad,
                    duration:duration,
                    useNativeDriver: true
                }),
                Animated.timing(this.state.scaleAnimation, {
                    toValue: viewTransform.scaleX,
                    duration,
                    useNativeDriver: true
                })
            ]).start();
            this.setState({
                viewTransform: viewTransform
            });
        };
        this.processPinch = (x1, y1, x2, y2,event) => {
            const distance = calcDistance(x1, y1, x2, y2);
            if (!this.state.isScaling) {
                this.setState({
                    isScaling: true,
                    initialDistance: distance,
                    initialTransform: this.state.viewTransform,
                });
                return;
            }
            const center = calcCenter(x1, y1, x2, y2);
            const { viewTransform, initialDistance, initialTransform, viewDimensions, } = this.state;
            const { canvasHeight, canvasWidth, minScale, maxScale } = this.props;
            const touchZoom = distance / initialDistance;
            const zoomScale = (touchZoom * initialTransform.scaleX) / viewTransform.scaleX;
            const panOffset = {
                x: (initialTransform.translateX + viewDimensions.pageX),
                y: (initialTransform.translateY + viewDimensions.pageY)
            };
            const pinchCenterPoint = {
                x: (center.x - panOffset.x),
                y: (center.y - panOffset.y)
            };
            const canvasCenter = {
                x: canvasWidth / 2,
                y: canvasHeight / 2
            };
            //When initial scale of canvas is different from 1, the pinch center point will be translated.
            //This is due to screen center and canvas center differs if the size of them arent equal
            const initialZoomDisplacement = {
                x: (pinchCenterPoint.x - canvasCenter.x) - (pinchCenterPoint.x - canvasCenter.x) / initialTransform.scaleX,
                y: (pinchCenterPoint.y - canvasCenter.y) - (pinchCenterPoint.y - canvasCenter.y) / initialTransform.scaleY,
            };
            const zoomPoint = {
                x: canvasCenter.x - pinchCenterPoint.x + initialZoomDisplacement.x,
                y: canvasCenter.y - pinchCenterPoint.y + initialZoomDisplacement.y,
            };
            let zoomDisplacement = {
                x: -(zoomPoint.x - zoomPoint.x * zoomScale),
                y: -(zoomPoint.y - zoomPoint.y * zoomScale)
            };
            const scalingMatrix = createScalingMatrix(zoomScale);
            const tranlationMatrix = createTranslationMatrix(zoomDisplacement.x, zoomDisplacement.y);
            const transform = viewTransformMult(tranlationMatrix, scalingMatrix);
            let newTransform = getBoundedPinchTransform(viewTransform, viewTransformMult(viewTransform, transform), minScale, maxScale);
            Animated.parallel([
                Animated.timing(this.state.TranslationAnimation, {
                    toValue: { x: newTransform.translateX, y: newTransform.translateY },
                    duration: 0,
                    useNativeDriver: true
                }),
                Animated.timing(this.state.scaleAnimation, {
                    toValue: newTransform.scaleX,
                    duration: 0,
                    useNativeDriver: true
                })
            ]).start();
            this.setState({
                viewTransform: newTransform,
            });
        };
        this.processTouch = (gestureState) => {
            if (!this.state.isMoving) {
                this.setState({
                    isMoving: true,
                    initialGestureState: { dy: 0, dx: 0 },
                    initialTransform: this.state.viewTransform,
                });
                return;
            }
            const { viewTransform, initialGestureState, initialTransform, viewDimensions } = this.state;
            const { canvasWidth, canvasHeight } = this.props;
            let rotDim=rotatedDim(canvasWidth,canvasHeight,this.state.rotateAnimation)
            /*gestureState holds total displacement since pan started.
              Here we calculate difference since last call of processTouch */
            const displacement = {
                x: (gestureState.dx - initialGestureState.dx) / viewTransform.scaleX,
                y: (gestureState.dy - initialGestureState.dy) / viewTransform.scaleY,
            };
            const tranlationMatrix = createTranslationMatrix(displacement.x, displacement.y);
            const newTransform = getBoundedTouchTransform(initialTransform, viewTransform, viewTransformMult(viewTransform, tranlationMatrix), viewDimensions, rotDim.width, rotDim.height);
            Animated.timing(this.state.TranslationAnimation, {
                toValue: {
                    x: newTransform.translateX,
                    y: newTransform.translateY
                },
                duration: 0,
                useNativeDriver: true
            }).start();
            this.setState({
                viewTransform: newTransform,
                initialGestureState: { dx: gestureState.dx, dy: gestureState.dy },
            });
        };
        const vt = this.getInitialViewTransform(props.canvasWidth, props.canvasHeight, props.initialZoom);
        this.state = {
            //Layout state
            layoutKnown: false,
            viewDimensions: { height: 0, width: 0, pageX: 0, pageY: 0 },
            //ViewTransform state
            viewTransform: vt,
            isScaling: false,
            initialDistance: 1,
            initialTransform: createIdentityTransform(),
            initialScale: props.initialZoom,
            initialTranslation: { x: 0, y: 0 },
            isMoving: false,
            initialGestureState: { dx: 0, dy: 0 },
            //ViewTransform animation state
            TranslationAnimation: new Animated.ValueXY({ x: vt.translateX, y: vt.translateY }),
            scaleAnimation: new Animated.Value(vt.scaleX),
            // autorotate
            rotateAnimation:0,
            before:{x:0,y:0},
            after:{x:0,y:0},
            matrix:createIdentityMatrix()
        };
    }
    componentWillMount() {
        this.state.scaleAnimation.addListener((zoom) => {
            this.props.onZoom(zoom.value); 
            this.zoomPoint.scale=zoom.value
        });
        this.prInstance = PanResponder.create({
            onStartShouldSetPanResponder: (evt, gestureState) => false,
            onStartShouldSetPanResponderCapture: (evt, gestureState) => false,
            onMoveShouldSetPanResponder: (evt, gestureState) => true,
            onMoveShouldSetPanResponderCapture: (evt, gestureState) => false,
            onPanResponderGrant: (evt, gestureState) => {
                // autorotate
                this.prevAngle = 0;
                this.prevDistance = 0;
                this.initialTouchesAngle = 0;
                this.initialTouches = evt.nativeEvent.touches;
                // Set self for filtering events from other PanResponderTarges
                if (this.prTargetSelf == null) {
                    if (this.prTargetOuter == null) {
                        this.prTargetOuter = evt.currentTarget;
                    }
                    if (evt.target !== evt.currentTarget) {
                        this.prTargetSelf = evt.target;
                    }
                }
            },
            onPanResponderMove: (evt, gestureState) => {
                const touches = evt.nativeEvent.touches;
                // console.log('evt: ' + evt.target + '*************')
                if (this.dropNextEvt > 0) {
                    this.dropNextEvt--;
                    return;
                }
                //Child element events are bubbled up but are not valid in out context. Sort them out
                if (evt.target !== this.prTargetSelf && evt.target !== this.prTargetOuter) {
                    this.dropNextEvt++;
                    return;
                }
                //HACK: the native event has some glitches with far-off coordinates. Sort out the worst ones
                if ((Math.abs(gestureState.vx) + Math.abs(gestureState.vx)) > 6) {
                    this.dropNextEvt++;
                    return;
                }
                if (touches.length === 2) {
                    this.processPinch(touches[0].pageX, touches[0].pageY, touches[1].pageX, touches[1].pageY,evt);
                }
                else if (touches.length === 1 && !this.state.isScaling) {
                    this.processTouch(gestureState);
                }
            },
            onPanResponderTerminationRequest: (evt, gestureState) => true,
            onPanResponderRelease: (evt, gestureState) => {
                this.setState({
                    isScaling: false,
                    isMoving: false,
                });
            },
            onPanResponderTerminate: (evt, gestureState) => { },
        });
    }
    render() {
        const { canvasHeight, canvasWidth, viewStyle, canvasStyle, children, } = this.props;
        return (<View ref={v => this.mainViewRef = v} style={StyleSheet.flatten([
            {
                flex: 1,
                justifyContent: 'center',
                alignItems: 'flex-start',
            },
            viewStyle
        ])} onLayout={this._onLayout} {...this.prInstance.panHandlers}>
        <Animated.View style={Object.assign({ width: canvasWidth, height: canvasHeight, 
        transform: [
                { translateX: this.state.TranslationAnimation.x },
                { translateY: this.state.TranslationAnimation.y },
                {rotate:this._rotateStr},
                { scale: this.state.scaleAnimation },
            ] }, canvasStyle)}>
          <SvgView>
            {children}
          </SvgView>
        </Animated.View>

      </View>);
    }
    getInitialViewTransform(canvasWidth, canvasHeight, scale) {
        return viewTransformMult(createTranslationMatrix(-(canvasWidth - canvasWidth * scale) / 2, -(canvasHeight - canvasHeight * scale) / 2), createScalingMatrix(scale));
    }
}
SvgPanZoom.defaultProps = {
    canvasHeight: 1080,
    canvasWidth: 720,
    minScale: 0.5,
    maxScale: 1.0,
    initialZoom: 0.7,
    canvasStyle: {},
    viewStyle: {},
    onZoom: (zoom) => { },
};


function rotate_point(pointX, pointY, originX, originY, angle) {
    angle = angle * Math.PI / 180.0;
    return {
        x: Math.cos(angle) * (pointX-originX) - Math.sin(angle) * (pointY-originY) + originX,
        y: Math.sin(angle) * (pointX-originX) + Math.cos(angle) * (pointY-originY) + originY
    };
}