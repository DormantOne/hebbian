import path from 'path'
import fs from 'fs'

import SVGBuilder from "svg-designer/lib/SVGBuilder.js"
import PointMath from "svg-designer/lib/math/PointMath.js"

const __filename = import.meta.url.slice("file://".length).slice(process.platform === "win32" ? 1 : 0)
const __dirname = path.dirname(__filename)

const PM = PointMath

//  We are in <project_root>/icon-design
// We want to locate <project_root>
const projectDir = path.dirname(__dirname)

const outFile = path.join(projectDir, "icon.svg")

const W = 64
const H = 64

const finalPadding = 4

const icon = new SVGBuilder(W, H)


const cartToPixel = ([x, y]) => {
    return PointMath.sum([W / 2, H / 2], [x * W / 2, -y * H / 2])
}

const cTP = cartToPixel

const cartSizeToPixel = ([w, h]) => {
    return [w * W / 2, -h * H / 2]
}

const cSTP = cartSizeToPixel

function drawArrow(shaftStartCart, shaftEndCart, strokeStyle = "black", strokeWidth = 2, tipAngleDegrees = 45, tipLengthCartesian = 0.3) {
    const lineDrawer = (p1, p2) => {
        icon.artist(strokeStyle, strokeWidth).lineSequence([cTP(p1), cTP(p2)], false).commit()
    }
    lineDrawer(shaftStartCart, shaftEndCart)
    const shaftAngle = Math.atan2(...(PointMath.difference(shaftEndCart, shaftStartCart).reverse()))
    const tipAngleRadians = tipAngleDegrees * Math.PI / 180
    const arrowAngle1 = shaftAngle - Math.PI - tipAngleRadians
    const arrowAngle2 = shaftAngle - Math.PI + tipAngleRadians
    lineDrawer(
        shaftEndCart,
        PointMath.sum(shaftEndCart, [Math.cos(arrowAngle1) * tipLengthCartesian, Math.sin(arrowAngle1) * tipLengthCartesian])
    )
    lineDrawer(
        shaftEndCart,
        PointMath.sum(shaftEndCart, [Math.cos(arrowAngle2) * tipLengthCartesian, Math.sin(arrowAngle2) * tipLengthCartesian])
    )
}

function drawDot(centerCart, radiusCart, strokeStyle, strokeWidth, fillStyle) {
    // Works since in this script W and H are identical
    const radiusPixels = radiusCart * W / 2
    const centerPixels = cTP(centerCart)
    icon.artist(strokeStyle, strokeWidth, fillStyle).circle(PM.toXYObject(centerPixels), radiusPixels).commit()
}

function connectDots(dot1Center, dot1Radius, dot2Center, dot2Radius, strokeStyle = "black", strokeWidth = 2, tipAngleDegrees = 45, tipLengthCartesian = 0.3) {
    const angle = Math.atan2(...(PM.difference(dot2Center, dot1Center).reverse()))
    const A = PM.sum(dot1Center, PM.scaledBy(PM.directionVector(angle), dot1Radius))
    const B = PM.sum(dot2Center, PM.scaledBy(PM.directionVector(angle - Math.PI), dot2Radius))
    drawArrow(A, B, strokeStyle, strokeWidth, tipAngleDegrees, tipLengthCartesian)
}

const R = 0.7
const r = 0.3
const tipLength = 0.3

const C1 =PM.scaledBy(PM.directionVector(Math.PI/2 - 2* Math.PI / 3),R)
const C2 = PM.scaledBy(PM.directionVector(Math.PI/2),R)
const C3 = PM.scaledBy(PM.directionVector(Math.PI/2 + 2* Math.PI / 3),R)

drawDot(C1,r,"black",2,"blue")
drawDot(C2,r,"black",2,"green")
drawDot(C3,r,"black",2,"red")

connectDots(C1,r,C2,r,"black",2,45,tipLength)
connectDots(C2,r,C3,r,"black",2,45,tipLength)
connectDots(C3,r,C1,r,"black",2,45,tipLength)



icon.adjustViewboxToFitContent(finalPadding, finalPadding)

fs.writeFileSync(outFile, icon.compile())



