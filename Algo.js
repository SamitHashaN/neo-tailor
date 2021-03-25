const img = document.querySelector("#image");
const sideimg = document.querySelector("#sideImage");
imgList = [];
window.frontBody = {};
window.sideBody = {};
let count = 0;

const source_2 = {
    id: "id_source_1",
    facing: "environment",
    kind: "kind_1" | "kind_2",
    label: "label_1" | "label_2"
};

const constraints = {
    audio: false,
    video: { facingMode: 'environment' },
};

const captureVideoButton = document.querySelector("#start");
const screenshotButton = document.querySelector("#screenshot-button");
const predict = document.querySelector("#predict");
const video2 = document.querySelector("#screenshot video");

const canvas2 = document.createElement("canvas");

captureVideoButton.onclick = function () {
    // const handleError = 1;
    navigator.mediaDevices
        .getUserMedia(constraints)
        .then(handleSuccess)
        .catch(handleError);
};

screenshotButton.onclick = video2.onclick = function () {
    canvas2.width = video2.videoWidth;
    canvas2.height = video2.videoHeight;
    canvas2.getContext("2d").drawImage(video2, 0, 0);
    imgList.push(canvas2.toDataURL("image/webp"));
    
};

predict.onclick = function () {
    console.log('predict');
    loadAndPredict();
};

function handleSuccess(stream) {
    screenshotButton.disabled = false;
    video2.srcObject = stream;
    if (video2.srcObject) {
        video2.srcObject.getTracks().forEach(track => track.stop());
        video2.srcObject = null;
    }
    navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'environment'
      }});
}



// function takepicture() {
//     var context = canvas.getContext('2d');
//     if (width && height) {
//       canvas.width = width;
//       canvas.height = height;
//       context.drawImage(video, 0, 0, width, height);

//       var data = canvas.toDataURL('image/png');
//       photo.setAttribute('src', data);
//     } else {
//       clearphoto();
//     }
//   }


async function loadAndPredict() {
    const net = await bodyPix.load({
        // architecture: 'ResNet50',
        // outputStride: 16,
        // quantBytes: 4

        architecture: 'MobileNetV1',
        outputStride: 16,
        multiplier: 0.75,
        quantBytes: 2
    });
    const partSegmentation = await net.segmentPersonParts(imgList[0], {
        flipHorizontal: false,
        internalResolution: 'medium',
        segmentationThreshold: 0.5,  ///Change to obtain maximum performance
        maxDetections: 1
    });

    const sidepartSegmentation = await net.segmentPersonParts(imgList[1], {
        flipHorizontal: false,
        internalResolution: 'medium',
        segmentationThreshold: 0.5,  ///Change to obtain maximum performance
        maxDetections: 1
    });

    console.log(partSegmentation);

    const coloredPartImage = bodyPix.toColoredPartMask(partSegmentation);

    const w = partSegmentation.width;
    const h = partSegmentation.height;
    const buff = partSegmentation.data;

    const w2 = sidepartSegmentation.width;
    const h2 = sidepartSegmentation.height;
    const buff2 = sidepartSegmentation.data;



    getKeypoints(partSegmentation, frontBody);
    getKeypoints(sidepartSegmentation, sideBody);



    const sideData = bodyCalculate(buff2, w2, h2, 2);
    const frontData = bodyCalculate(buff, w, h, 1);




    const outPut = finalOutput(frontData, sideData);


    var myString = JSON.stringify(outPut);
    document.getElementById("demo").innerHTML = myString;

    console.log(outPut);


    // drawingSection(coloredPartImage);

}

///////////////////////// bounding box algo///////////////////////////////////

// const isNotEmpty = (color, bodyPart) => color == bodyPart[0] || color == bodyPart[1];
const isNotEmpty = (color, bodyPart) => bodyPart.includes(color);

function getTop(buff, w, h, bodyPart) {
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            let i = y * w + x;
            if (isNotEmpty(buff[i], bodyPart)) {
                return { x, y }
            }
        }
    }
}

function getRight(buff, w, h, bodyPart) {
    for (let x = w; x >= 0; x--) {
        for (let y = 0; y < h; y++) {
            let i = y * w + x;
            if (isNotEmpty(buff[i], bodyPart)) {
                return { x, y }
            }
        }
    }
}

function getRightwidth(buff, w, h, bodyPart) {
    for (let x = w; x >= 0; x--) {
        for (let y = h; y < h + 1; y++) {
            let i = y * w + x;
            if (isNotEmpty(buff[i], bodyPart)) {
                return { x, y }
            }
        }
    }
}



function getBottom(buff, w, h, bodyPart) {
    for (let y = h; y >= 0; y--) {
        for (let x = 0; x < w; x++) {
            let i = y * w + x;
            if (isNotEmpty(buff[i], bodyPart)) {
                return { x, y }
            }
        }
    }
}

function getLeft(buff, w, h, bodyPart) {
    for (let x = 0; x < w; x++) {
        for (let y = 0; y < h; y++) {
            let i = y * w + x;
            if (isNotEmpty(buff[i], bodyPart)) {
                return { x, y }
            }
        }
    }
}

function getLeftwidth(buff, w, h, bodyPart) {
    for (let x = 0; x < w; x++) {
        for (let y = h; y < h + 1; y++) {
            let i = y * w + x;
            if (isNotEmpty(buff[i], bodyPart)) {
                return { x, y }
            }
        }
    }
}

////////obtain the horizontal width////////////////
function getWidth(buff, w, h, bodyPart) {
    bodySeg = [12, 13];
    const leftWidth = getLeftwidth(buff, w, h, bodyPart);
    const rightWidth = getRightwidth(buff, w, h, bodyPart);

    return [leftWidth, rightWidth];


}
///////////////obtain the vertical height/////////////
function getHeight(buff, w, h) {
    const headPart = [0, 1];
    const footPart = [22, 23];
    const topHead = getTop(buff, w, h, headPart);
    const bottomFoot = getBottom(buff, w, h, footPart);

    return [topHead, bottomFoot];

}

function getKeypoints(partSeg, keyArray) {
    //////////////////////////////////////////////////////
    // 0:  "nose"                     
    // 1:  "leftEye"
    // 2:  "rightEye"
    // 3:  "leftEar"
    // 4:  "rightEar"

    // 5:  "leftShoulder" ​​​​
    // 6:  "rightShoulder" 
    // 7:  "leftElbow" 
    // 8:  "rightElbow" ​​​​
    // 9:  "leftWrist" ​​​​
    // 10:  "rightWrist" 

    // 11:  "leftHip"  ​​​​
    // 12:  "rightHip" ​​​​
    // 13:  "leftKnee"  ​​​​
    // 14:  "rightKnee"  ​​​​
    // 15:  "leftAnkle"  ​​​​
    // 16:  "rightAnkle" 

    //////////////////////////////////////////////////////////////////////////////
    const keypoints = partSeg.allPoses[0].keypoints;

    keyArray.nose = keypoints[0].position;
    keyArray.leftEye = keypoints[1].position;
    keyArray.rightEye = keypoints[2].position;
    keyArray.leftEar = keypoints[3].position;
    keyArray.rightEar = keypoints[4].position;

    keyArray.leftShoulder = keypoints[5].position;
    keyArray.rightShoulder = keypoints[6].position;
    keyArray.leftElbow = keypoints[7].position;
    keyArray.rightElbow = keypoints[8].position;
    keyArray.leftWrist = keypoints[9].position;
    keyArray.rightWrist = keypoints[10].position;

    keyArray.leftHip = keypoints[11].position;
    keyArray.rightHip = keypoints[12].position;
    keyArray.leftKnee = keypoints[13].position;
    keyArray.rightKnee = keypoints[14].position;
    keyArray.leftAnkle = keypoints[15].position;
    keyArray.rightAnkle = keypoints[16].position;

    keyArray.leftChest = {};
    keyArray.rightChest = {};
    keyArray.leftWaist = {};
    keyArray.rightWaist = {};

    keyArray.leftChest.y = keyArray.leftShoulder.y + (keyArray.leftHip.y - keyArray.leftShoulder.y) / 4;
    keyArray.leftChest.x = keyArray.leftShoulder.x;

    keyArray.rightChest.y = keyArray.rightShoulder.y + (keyArray.rightHip.y - keyArray.rightShoulder.y) / 4;
    keyArray.rightChest.x = keyArray.rightShoulder.x;

    keyArray.leftWaist.y = keyArray.leftShoulder.y + 3 * (keyArray.leftHip.y - keyArray.leftShoulder.y) / 4;
    keyArray.leftWaist.x = keyArray.leftShoulder.x;

    keyArray.rightWaist.y = keyArray.rightShoulder.y + 3 * (keyArray.rightHip.y - keyArray.rightShoulder.y) / 4;
    keyArray.rightWaist.x = keyArray.rightShoulder.x;

}

function drawingSection(colorSeg) {

    //////////////////////// Drawing section///////////////////////////////////////////////////////////////

    // const canvas = document.getElementById('canvas');
    // canvas.style.position = "absolute";
    // canvas.style.left = img.offsetLeft + "px";
    // canvas.style.top = img.offsetTop + "px";


    // var ctx = canvas.getContext("2d");
    // ctx.beginPath();
    // ctx.arc(frontBody.nose.x, frontBody.nose.y, 20, 0, 2 * Math.PI, false);
    // ctx.lineWidth = 3;
    // ctx.strokeStyle = '#00ff00';
    // ctx.stroke();

    ///Torso/////
    // ctx.strokeStyle = '#00ff00';
    // ctx.beginPath();
    // ctx.moveTo( rightShoulder.x, 0.98 * rightShoulder.y);
    // ctx.lineTo( leftShoulder.x, 0.98 * leftShoulder.y);
    // ctx.lineTo(leftChest.x, leftChest.y);
    // ctx.lineTo(leftHip.x, leftHip.y);
    // ctx.lineTo(rightHip.x, rightHip.y);
    // ctx.lineTo(rightChest.x, rightChest.y);
    // ctx.closePath();
    // ctx.stroke();
    // // chest//
    // ctx.strokeStyle = '#00ff00';
    // ctx.beginPath();
    // ctx.moveTo(leftChest.x, leftChest.y);
    // ctx.lineTo(rightChest.x, rightChest.y);
    // // ctx.closePath();
    // ctx.stroke();



    // //shoulder width
    // ctx.strokeStyle = '#00ff00';
    // ctx.beginPath();
    // ctx.moveTo(should[0].x, should[0].y);
    // ctx.lineTo(should[1].x, should[1].y);
    // // ctx.closePath();
    // ctx.stroke();

    // //chest width
    // ctx.strokeStyle = '#00ff00';
    // ctx.beginPath();
    // ctx.moveTo(chestdis[0].x, chestdis[0].y);
    // ctx.lineTo(chestdis[1].x, chestdis[1].y);
    // // ctx.closePath();
    // ctx.stroke();

    // //waist width
    // ctx.strokeStyle = '#00ff00';
    // ctx.beginPath();
    // ctx.moveTo(waistdis[0].x, waistdis[0].y);
    // ctx.lineTo(waistdis[1].x, waistdis[1].y);
    // // ctx.closePath();
    // ctx.stroke();

    // //hip width
    // ctx.strokeStyle = '#00ff00';
    // ctx.beginPath();
    // ctx.moveTo(hipdis[0].x, hipdis[0].y);
    // ctx.lineTo(hipdis[1].x, hipdis[1].y);
    // // ctx.closePath();
    // ctx.stroke();




    const canvas2 = document.getElementById('canvas2');

    const opacity = 0.7;
    const flipHorizontal = false;
    const maskBlurAmount = 0;

    bodyPix.drawMask(
        canvas2, img, colorSeg, opacity, maskBlurAmount,
        flipHorizontal);

}

function bodyCalculate(buff, w, h, q) {

    if (q == 1) {
        ///Get height/////////
        const heightPoints = getHeight(buff, w, h);
        console.log(heightPoints);
        const heightDistance = getdis(heightPoints);
        const actualHeight = 169;
        const scaleFactor = actualHeight / heightDistance;

        //shoulder
        const k = Math.round(frontBody.rightShoulder.y);
        window.should = getWidth(buff, w, k, [12, 13]);
        const shouldDistance = scaleFactor * getdis(should);

        //Chest
        const p = Math.round(frontBody.rightChest.y);
        window.chestdis = getWidth(buff, w, p, [12, 13]);
        const chestDistance = scaleFactor * getdis(chestdis);

        //waist
        const n = Math.round(frontBody.rightWaist.y);
        window.waistdis = getWidth(buff, w, n, [12, 13]);
        const waistDistance = scaleFactor * getdis(waistdis);

        //hip

        const m = Math.round(frontBody.rightHip.y);
        window.hipdis = getWidth(buff, w, m, [12, 13, 14, 15, 16, 17]);
        const hipDistance = scaleFactor * getdis(hipdis);

        console.log(shouldDistance, chestDistance, waistDistance, hipDistance);
        return { fShoulder: shouldDistance, fchest: chestDistance, fwaist: waistDistance, fhip: hipDistance };

    }


    if (q == 2) {
        ///Get height/////////
        const heightPoints = getHeight(buff, w, h);
        const heightDistance = getdis(heightPoints);
        const actualHeight = 169;
        const scaleFactor = actualHeight / heightDistance;

        //shoulder
        const k = Math.round(sideBody.rightShoulder.y);
        window.should = getWidth(buff, w, k, [12, 13]);
        const shouldDistance = scaleFactor * getdis(should);

        //Chest
        const p = Math.round(sideBody.rightChest.y);
        window.chestdis = getWidth(buff, w, p, [12, 13]);
        const chestDistance = scaleFactor * getdis(chestdis);

        //waist
        const n = Math.round(sideBody.rightWaist.y);
        window.waistdis = getWidth(buff, w, n, [12, 13]);
        const waistDistance = scaleFactor * getdis(waistdis);

        //hip

        const m = Math.round(sideBody.rightHip.y);
        window.hipdis = getWidth(buff, w, m, [12, 13, 14, 15, 16, 17]);
        const hipDistance = scaleFactor * getdis(hipdis);

        return { sShoulder: shouldDistance, schest: chestDistance, swaist: waistDistance, ship: hipDistance };
        // console.log(shouldDistance,chestDistance,waistDistance,hipDistance);
    }



}

function getdis(points) {
    return Math.sqrt(Math.pow(points[0].x - points[1].x, 2) + Math.pow(points[0].y - points[1].y, 2));
}

function girthCalculation(dist1, dist2) {
    dist1 = dist1 / 2;
    dist2 = dist2 / 2;
    return perimeter = 2 * Math.PI * Math.sqrt((dist1 * dist1 + dist2 * dist2) / 2);
}

function finalOutput(front, side) {
    const chestGirth = girthCalculation(front.fchest, side.schest);
    const waistGirth = girthCalculation(front.fwaist, side.swaist);
    const hipGirth = girthCalculation(front.fhip, side.swaist);

    return { Shoulder: front.fShoulder, Chest: chestGirth, Waist: waistGirth, Hip: hipGirth }
}

