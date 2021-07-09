import {
  Point,
  ViewTransform,
  ViewDimensions,
} from './interfaces';

export function calcDistance(x1, y1, x2, y2) {
  let dx = Math.abs(x1 - x2)
  let dy = Math.abs(y1 - y2)
  return Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));
}

export function calcCenter(x1, y1, x2, y2) {
  return{
    x:(x1+x2)/2,
    y:(y1+y2)/2
}
  // function middle(p1: { x: number, y: number }, p2: { x: number, y: number }): { x: number, y: number } {
  //   return {
  //     x: (p1.x + p2.x) / 2,
  //     y: (p1.y + p2.y) / 2
  //   };
  // }

  // let point1 = { x: x1, y: y1 }
  // let point2 = { x: x2, y: y2 }
  // let mid = middle(point1, point2)

  // return {
  //   x: mid.x,
  //   y: mid.y
  // };
}
/*
* Get current touches
*
* @param {Object} initial event
* @return {Array}
*/

export function maxOffset(offset, windowDimension, imageDimension) {
  let max = windowDimension - imageDimension;
  if (max >= 0) {
    return 0;
  }
  return offset < max ? max : offset;
}

export function createIdentityTransform() {
  return {
    scaleX: 1,
    skewX: 0,
    skewY: 0,
    scaleY: 1,
    translateX: 0,
    translateY: 0
  }
}

export function createTranslationMatrix(translateX: number, translateY: number): ViewTransform {
  return {
    scaleX: 1,
    skewX: 0,
    skewY: 0,
    scaleY: 1,
    translateX: translateX,
    translateY: translateY
  }
}

export function createScalingMatrix(scale: number): ViewTransform {
  return {
    scaleX: scale,
    skewX: 0,
    skewY: 0,
    scaleY: scale,
    translateX: 0,
    translateY: 0
  }
}

export function viewTransformMult(vtA: ViewTransform, vtB: ViewTransform): ViewTransform {

  //Convert ViewTransform to conventional 3x3 matrices
  var mA = [vtA.scaleX, vtA.skewY, vtA.translateX, vtA.skewX, vtA.scaleY, vtA.translateY];
  var mB = [vtB.scaleX, vtB.skewY, vtB.translateX, vtB.skewX, vtB.scaleY, vtB.translateY];
  var mC = [];
  mC[0] = mA[0] * mB[0] + mA[1] * mB[3];
  mC[1] = mA[0] * mB[1] + mA[1] * mB[4];
  mC[2] = mA[0] * mB[2] + mA[1] * mB[5] + mA[2] * 1;
  mC[3] = mA[3] * mB[0] + mA[4] * mB[3];
  mC[4] = mA[3] * mB[1] + mA[4] * mB[4];
  mC[5] = mA[3] * mB[2] + mA[4] * mB[5] + mA[5] * 1;

  var result: ViewTransform = {
    scaleX: mC[0],
    skewX: mC[3],
    skewY: mC[1],
    scaleY: mC[4],
    translateX: mC[2],
    translateY: mC[5]
  };

  return result;
}

export function getBoundedPinchTransform(oldTransform: ViewTransform, newTransform: ViewTransform, minScale: number, maxScale: number): ViewTransform {
  let boundedTransform = { ...newTransform }

  //Calculate scale bounds
  boundedTransform.scaleX = Math.min(Math.max(boundedTransform.scaleX, minScale), maxScale)
  boundedTransform.scaleY = Math.min(Math.max(boundedTransform.scaleY, minScale), maxScale)

  if (boundedTransform.scaleX !== newTransform.scaleX || boundedTransform.scaleY !== newTransform.scaleY) {
    boundedTransform.translateX = oldTransform.translateX
    boundedTransform.translateY = oldTransform.translateY
  }

  return boundedTransform
}

export function getBoundedTouchTransform(
  initialTransform: ViewTransform, oldTransform: ViewTransform, newTransform: ViewTransform,
  viewDim: ViewDimensions, canvasWidth: number, canvasHeight: number
): ViewTransform {
  let boundedTransform = { ...newTransform }

  const scaledCanvas = {
    width: boundedTransform.scaleX * canvasWidth,
    height: boundedTransform.scaleY * canvasHeight
  }

  let maxBounds: Point = {
    x: Infinity,
    y: Infinity
  }

  let minBounds: Point = {
    x: -Infinity,
    y: -Infinity
  }

  const zoomDisplacement: Point = {
    x: (canvasWidth - scaledCanvas.width) / 2,
    y: (canvasHeight - scaledCanvas.height) / 2
  }

  const extendPercentage = 0.8
  const extendLimit = (viewDim.width * extendPercentage)

  //Entire Canvas can be seen within the view
  if (scaledCanvas.width < viewDim.width &&
    scaledCanvas.height < viewDim.height) {

    maxBounds = {
      x: (viewDim.width - scaledCanvas.width) + extendLimit - zoomDisplacement.x,
      y: (viewDim.height - scaledCanvas.height) + extendLimit - zoomDisplacement.y
    }

    minBounds = {
      x: - zoomDisplacement.x - extendLimit,
      y: - zoomDisplacement.y - extendLimit
    }

    if (initialTransform.translateX > maxBounds.x) {
      maxBounds.x = initialTransform.translateX
    }

    if (initialTransform.translateX < minBounds.x) {
      minBounds.x = initialTransform.translateX
    }

    if (initialTransform.translateY > maxBounds.y) {
      maxBounds.y = initialTransform.translateY
    }

    if (initialTransform.translateY < minBounds.y) {
      minBounds.y = initialTransform.translateY
    }

  }
  else {
    maxBounds = {
      x: viewDim.width - zoomDisplacement.x - extendLimit,
      y: viewDim.height - zoomDisplacement.y - extendLimit
    }

    minBounds = {
      x: - zoomDisplacement.x - (scaledCanvas.width) + extendLimit,
      y: - zoomDisplacement.y - (scaledCanvas.height) + extendLimit
    }
  }

  boundedTransform.translateX = Math.min(Math.max(boundedTransform.translateX, minBounds.x), maxBounds.x)
  boundedTransform.translateY = Math.min(Math.max(boundedTransform.translateY, minBounds.y), maxBounds.y)

  return boundedTransform
}
export const calcMul90 = (angle) => {
  angle = normalise_angle(angle)
  if (angle === 0) { return angle }
  if (angle < 90) {
    if (angle > (90 / 2)) { angle = 90 } else { angle = 0 }
  } else {
    let newAngle = 0
    let temp = angle
    while (temp > 90) {
      temp = temp - 90
      newAngle = newAngle + 90
    }
    if ((angle - newAngle) >= (90 / 2)) {
      newAngle = newAngle + 90
    }
    if(angle % 360 ===0) angle = 0
    angle = newAngle
  }
  return angle
}
export const rotatedDim=(inner_rectangle_width, inner_rectangle_height, rotate_in_degrees)=> {
  var width = inner_rectangle_width
  var height = inner_rectangle_height
  var angle = (rotate_in_degrees * Math.PI) / 180

  // rectangle centre coords
  var centre_x = width / 2;
  var centre_y = height / 2;
  var corners = [[0, 0], [0, height], [width, height], [width, 0]];

  corners.map(function (points) {
    // translate rectangle centre to origin
    var temp_x = points[0] - centre_x;
    var temp_y = points[1] - centre_y;

    // do rotation
    var rotated_x = (temp_x * Math.cos(angle)) - (temp_y * Math.sin(angle));
    var rotated_y = (temp_x * Math.sin(angle)) + (temp_y * Math.cos(angle));

    // translate rectangle centre back to original place
    points[0] = rotated_x + centre_x;
    points[1] = rotated_y + centre_y;
    points
  });

  var min_x=Math.min.apply(null,corners.map((e)=>e[0]))
  var max_x=Math.max.apply(null,corners.map((e)=>e[0]))
  width = max_x - min_x;
  var min_y=Math.min.apply(null,corners.map((e)=>e[1]))
  var max_y=Math.max.apply(null,corners.map((e)=>e[1]))
  height = max_y - min_y;

  return {width,height}
}
export const withRotate = (x,y, theta) => {
  const {cos,sin}=Math
  let xx= x*cos(theta)-y*sin(theta)
  let yy= x*sin(theta)+y*cos(theta)
  return {x:xx,y:yy}
}
// convert negative angle to positive 
export const normalise_angle = (angle) => {
  // """ If angle is negative then convert it to positive. """
  while (angle != 0 & (Math.abs(angle) == (angle * -1))) {
      angle = 360 + angle
  }
  return angle
}