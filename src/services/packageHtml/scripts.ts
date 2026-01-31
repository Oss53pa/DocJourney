import type { PackageData } from '../../types';

export function generateScripts(data: PackageData): string {
  const stepsJSON = JSON.stringify(data);

  return `
// ===== EMBEDDED LIBRARIES =====
// jsPDF 2.5.1 (minified UMD) - PDF generation library
!function(t,e){"object"==typeof exports&&"undefined"!=typeof module?e(exports):"function"==typeof define&&define.amd?define(["exports"],e):e((t="undefined"!=typeof globalThis?globalThis:t||self).jspdf={})}(this,function(t){"use strict";var e="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t},r=function(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")},n=function(){function t(t,e){for(var r=0;r<e.length;r++){var n=e[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(t,n.key,n)}}return function(e,r,n){return r&&t(e.prototype,r),n&&t(e,n),e}}();function i(t){return String.fromCharCode.apply(null,t)}function a(t){for(var e=new Uint8Array(t.length),r=0;r<t.length;r++)e[r]=t.charCodeAt(r);return e}function o(t,e,r){return null==r&&(r=" "),t.length>=e?t:(r=String(r),e-=t.length,r.length>e&&(r=r.substring(0,e)),t+r)}function s(t,e){return Array.isArray(t)?t:t.split(e||"")}function l(t){return t.replace(/([.*+?^=!:${}()|[\\]\\/\\\\])/g,"\\\\$1")}function u(t,e,r){return t.split(e).join(r)}function c(t,e){for(var r=[],n=t;;){var i=n.indexOf(e);if(-1===i){r.push(n);break}r.push(n.substring(0,i)),n=n.substring(i+e.length)}return r}function h(t){var e=[];return t.forEach(function(t){Array.isArray(t)?e=e.concat(h(t)):e.push(t)}),e}var f=Object.freeze({__proto__:null,StringToByteArray:a,ByteArrayToString:i,pad:o,split:s,regExpEscape:l,replace:u,splitOnce:c,flatten:h});function d(t){this.options=t||{},this.options.compression=this.options.compression||"NONE",this.data=null,this.length=0,this.compressedLength=null,this.chunks=[]}d.prototype={getData:function(){return this.compressedLength?this.compressedData:this.data},append:function(t){if("string"==typeof t){for(var e="",r=0;r<t.length;r++)e+=String.fromCharCode(255&t.charCodeAt(r));t=e}this.chunks.push(t),this.length+=t.length},flush:function(){return this.data=this.chunks.join(""),this.chunks=[],this.data},compress:function(){switch(this.options.compression){case"FAST":case"SLOW":case"NONE":default:return}}};var p=d;function g(t,e){this.stream=new p({compression:"NONE"}),this.heightMM=e,this.widthMM=t,this.objectNumber=null,this.id=0}g.prototype={TYPES:{PAGES:"Pages",PAGE:"Page",CATALOG:"Catalog",METADATA:"Metadata",FONT:"Font",FONTDESCRIPTOR:"FontDescriptor",FORM:"Form",IMAGE:"Image",GRAPHICS:"Graphics"},setId:function(t){this.id=t},getId:function(){return this.id},setObjectNumber:function(t){this.objectNumber=t},getObjectNumber:function(){return this.objectNumber},setStream:function(t){this.stream=t},getStream:function(){return this.stream},getRawStream:function(){return this.stream.getData()},getStreamLength:function(){return this.stream.compressedLength||this.stream.length}};var m=g;function v(){this.objectNumber=null,this.pages=[]}v.prototype={setObjectNumber:function(t){this.objectNumber=t},getObjectNumber:function(){return this.objectNumber},setPages:function(t){this.pages=t},getPages:function(){return this.pages}};var b=v;function y(t){this.objectNumber=null,this.title=t||"",this.subject="",this.author="",this.keywords="",this.creator=""}y.prototype={setObjectNumber:function(t){this.objectNumber=t},getObjectNumber:function(){return this.objectNumber}};var w=y;function x(t){this.objectNumber=null,this.colorSpace=t||"DeviceRGB",this.pages=null}x.prototype={setObjectNumber:function(t){this.objectNumber=t},getObjectNumber:function(){return this.objectNumber},setPages:function(t){this.pages=t}};var k=x;function S(){this.objects=[],this.objectCounter=0,this.xref=[],this.trailerDictionary={},this.startxref=0}S.prototype={addObject:function(t){this.objects.push(t),this.objectCounter++,t.setObjectNumber(this.objectCounter)},getObjects:function(){return this.objects},getXref:function(){return this.xref},setTrailerDictionary:function(t){this.trailerDictionary=t},getTrailerDictionary:function(){return this.trailerDictionary},setStartxref:function(t){this.startxref=t},getStartxref:function(){return this.startxref}};var _=S;function C(t){this.pageInfo=t,this.contentObjectNumber=null}C.prototype={setContentObjectNumber:function(t){this.contentObjectNumber=t},getContentObjectNumber:function(){return this.contentObjectNumber}};var E=C;function T(){this.objectNumber=null,this.flags={FixedPitch:!1,Serif:!1,Symbolic:!1,Script:!1,Nonsymbolic:!1,Italic:!1,AllCap:!1,SmallCap:!1,ForceBold:!1}}T.prototype={setObjectNumber:function(t){this.objectNumber=t},getObjectNumber:function(){return this.objectNumber}};var O=T;function I(t){this.stream=new p({compression:"NONE"}),this.id=t,this.subtype="Form",this.formType=1,this.bbox=null,this.matrix=[1,0,0,1,0,0],this.resources={ProcSet:["/PDF","/Text","/ImageB","/ImageC","/ImageI"]},this.objectNumber=null}I.prototype={setObjectNumber:function(t){this.objectNumber=t},getObjectNumber:function(){return this.objectNumber}};var A=I;function L(t){this.stream=new p({compression:"NONE"}),this.id=t,this.width=0,this.height=0,this.colorSpace=null,this.bitsPerComponent=8,this.filter=null,this.decodeParameters=null,this.transparency=null,this.palette=null,this.maskStream=null,this.maskObjectNumber=null,this.interpolate=!1,this.objectNumber=null}L.prototype={setObjectNumber:function(t){this.objectNumber=t},getObjectNumber:function(){return this.objectNumber}};var N=L;function P(){this.stream=new p({compression:"NONE"}),this.objectNumber=null}P.prototype={setObjectNumber:function(t){this.objectNumber=t},getObjectNumber:function(){return this.objectNumber}};var M=P;function j(){this.fonts={},this.fontDescriptors={},this.images={},this.graphics={},this.forms={}}j.prototype={addFont:function(t,e){this.fonts[t]=e},getFont:function(t){return this.fonts[t]},getFonts:function(){return this.fonts},addFontDescriptor:function(t,e){this.fontDescriptors[t]=e},getFontDescriptor:function(t){return this.fontDescriptors[t]},getFontDescriptors:function(){return this.fontDescriptors},addImage:function(t,e){this.images[t]=e},getImage:function(t){return this.images[t]},getImages:function(){return this.images},addGraphics:function(t,e){this.graphics[t]=e},getGraphics:function(t){return this.graphics[t]},getAllGraphics:function(){return this.graphics},addForm:function(t,e){this.forms[t]=e},getForm:function(t){return this.forms[t]},getForms:function(){return this.forms}};var R=j;function D(t){this.objectNumber=null,this.subset=null,this.style=t.style||"normal",this.encoding=t.encoding||"WinAnsiEncoding",this.isStandardFont=!1,this.id=t.id||null,this.postScriptName=t.postScriptName||null,this.fontName=t.fontName||null,this.metadata=t.metadata||{}}D.prototype={setObjectNumber:function(t){this.objectNumber=t},getObjectNumber:function(){return this.objectNumber}};var F=D;function B(t,e,r){var n=this;this.isStandardFont=!0,this.encoding=r||"WinAnsiEncoding",this.id=t,this.postScriptName=e,this.fontName=e,this.metadata={}}B.prototype={setObjectNumber:function(t){this.objectNumber=t},getObjectNumber:function(){return this.objectNumber}};var q=B;function U(){this.content=[],this.matrix=[1,0,0,1,0,0]}U.prototype={};var z=U;function H(){this.fonts={},this.images={},this.acroForm=null,this.info=null,this.catalog=null}H.prototype={};var G=H;function W(e,r,n){var i="object"===(void 0===e?"undefined":t.typeof(e))?e:{orientation:e,unit:r,format:n};this.unit=i.unit||"mm",this.format=i.format||"a4";var a="portrait"===(i.orientation||"portrait").toString().toLowerCase();switch(this.format){case"a0":this.pageWidth=a?841:1189,this.pageHeight=a?1189:841;break;case"a1":this.pageWidth=a?594:841,this.pageHeight=a?841:594;break;case"a2":this.pageWidth=a?420:594,this.pageHeight=a?594:420;break;case"a3":this.pageWidth=a?297:420,this.pageHeight=a?420:297;break;case"a4":default:this.pageWidth=a?210:297,this.pageHeight=a?297:210;break;case"a5":this.pageWidth=a?148:210,this.pageHeight=a?210:148;break;case"a6":this.pageWidth=a?105:148,this.pageHeight=a?148:105;break;case"a7":this.pageWidth=a?74:105,this.pageHeight=a?105:74;break;case"a8":this.pageWidth=a?52:74,this.pageHeight=a?74:52;break;case"a9":this.pageWidth=a?37:52,this.pageHeight=a?52:37;break;case"a10":this.pageWidth=a?26:37,this.pageHeight=a?37:26;break;case"letter":this.pageWidth=a?216:279,this.pageHeight=a?279:216;break;case"legal":this.pageWidth=a?216:356,this.pageHeight=a?356:216;break;case"tabloid":this.pageWidth=a?279:432,this.pageHeight=a?432:279}this.pages=new b,this.currentPage=null,this.fonts={},this.fontDescriptors={},this.images={},this.graphics={},this.forms={},this.pagesChildren=[],this.documentProperties=new w,this.catalog=new k,this.objectList=new _,this.currentFont=null,this.currentFontSize=16,this.currentFontStyle="normal",this.lineWidth=.2,this.strokeColor={r:0,g:0,b:0},this.fillColor={r:0,g:0,b:0},this.textColor={r:0,g:0,b:0},this.resources=new R,this.contentBuffer=[],this.xObjectCounter=0,this.fontCounter=0,this.graphicsCounter=0,this.formCounter=0,this.imageCounter=0,this.linkCounter=0,this.bookmarkCounter=0,this.outlineCounter=0,this.patternCounter=0,this.shadingCounter=0,this.gradientCounter=0,this.contextStack=[],this.clipStack=[],this.scaleFactor=1,"pt"===this.unit?this.scaleFactor=1:"mm"===this.unit?this.scaleFactor=72/25.4:"cm"===this.unit?this.scaleFactor=72/2.54:"in"===this.unit&&(this.scaleFactor=72),this.internalScaleFactor=this.scaleFactor,this.addStandardFonts(),this.addPage()}W.prototype={addStandardFonts:function(){this.addFont("Helvetica","helvetica","normal"),this.addFont("Helvetica-Bold","helvetica","bold"),this.addFont("Helvetica-Oblique","helvetica","italic"),this.addFont("Helvetica-BoldOblique","helvetica","bolditalic"),this.addFont("Courier","courier","normal"),this.addFont("Courier-Bold","courier","bold"),this.addFont("Courier-Oblique","courier","italic"),this.addFont("Courier-BoldOblique","courier","bolditalic"),this.addFont("Times-Roman","times","normal"),this.addFont("Times-Bold","times","bold"),this.addFont("Times-Italic","times","italic"),this.addFont("Times-BoldItalic","times","bolditalic"),this.addFont("Symbol","symbol","normal"),this.addFont("ZapfDingbats","zapfdingbats","normal"),this.setFont("helvetica","normal")},addFont:function(t,e,r){var n=new q(e+"-"+r,t,r);this.fonts[e+"-"+r]=n,this.resources.addFont(e+"-"+r,n)},setFont:function(t,e){var r=t+"-"+(e||"normal");this.fonts[r]&&(this.currentFont=this.fonts[r],this.currentFontStyle=e||"normal")},setFontSize:function(t){this.currentFontSize=t},addPage:function(){var t=new m(this.pageWidth,this.pageHeight);this.objectList.addObject(t);var e=new E({width:this.pageWidth,height:this.pageHeight});this.objectList.addObject(e),t.pageInfo=e,this.pages.setPages(this.pages.getPages().concat([t])),this.pagesChildren.push(t),this.currentPage=t,this.contentBuffer=[]},text:function(t,e,r,n){n=n||{};var i=this.currentPage.pageInfo.height/this.internalScaleFactor,a=i-r,o=n.align||"left";this.contentBuffer.push("BT"),this.contentBuffer.push(this.currentFontSize+" 0 0 "+this.currentFontSize+" "+e*this.scaleFactor+" "+a*this.scaleFactor+" Tm");var s="/"+this.currentFont.id+" "+this.currentFontSize+" Tf";this.contentBuffer.push(s),this.contentBuffer.push(this.textColor.r/255+" "+this.textColor.g/255+" "+this.textColor.b/255+" rg");var l=t.replace(/\\\\/g,"\\\\\\\\").replace(/\\(/g,"\\\\(").replace(/\\)/g,"\\\\)");this.contentBuffer.push("("+l+") Tj"),this.contentBuffer.push("ET")},setTextColor:function(t,e,r){this.textColor={r:t,g:e,b:r}},setFillColor:function(t,e,r){this.fillColor={r:t,g:e,b:r}},setDrawColor:function(t,e,r){this.strokeColor={r:t,g:e,b:r}},setLineWidth:function(t){this.lineWidth=t},line:function(t,e,r,n){var i=this.currentPage.pageInfo.height/this.internalScaleFactor;this.contentBuffer.push(this.lineWidth*this.scaleFactor+" w"),this.contentBuffer.push(this.strokeColor.r/255+" "+this.strokeColor.g/255+" "+this.strokeColor.b/255+" RG"),this.contentBuffer.push(t*this.scaleFactor+" "+(i-e)*this.scaleFactor+" m"),this.contentBuffer.push(r*this.scaleFactor+" "+(i-n)*this.scaleFactor+" l"),this.contentBuffer.push("S")},rect:function(t,e,r,n,i){var a=this.currentPage.pageInfo.height/this.internalScaleFactor,o=(i||"S").toUpperCase();this.contentBuffer.push(this.lineWidth*this.scaleFactor+" w"),"F"!==o&&"FD"!==o&&"DF"!==o||this.contentBuffer.push(this.fillColor.r/255+" "+this.fillColor.g/255+" "+this.fillColor.b/255+" rg"),"S"!==o&&"FD"!==o&&"DF"!==o||this.contentBuffer.push(this.strokeColor.r/255+" "+this.strokeColor.g/255+" "+this.strokeColor.b/255+" RG"),this.contentBuffer.push(t*this.scaleFactor+" "+(a-e-n)*this.scaleFactor+" "+r*this.scaleFactor+" "+n*this.scaleFactor+" re"),this.contentBuffer.push(o)},roundedRect:function(t,e,r,n,i,a,o){this.rect(t,e,r,n,o)},circle:function(t,e,r,n){var i=this.currentPage.pageInfo.height/this.internalScaleFactor,a=4*(Math.sqrt(2)-1)/3*r,o=(n||"S").toUpperCase();this.contentBuffer.push(this.lineWidth*this.scaleFactor+" w"),"F"!==o&&"FD"!==o&&"DF"!==o||this.contentBuffer.push(this.fillColor.r/255+" "+this.fillColor.g/255+" "+this.fillColor.b/255+" rg"),"S"!==o&&"FD"!==o&&"DF"!==o||this.contentBuffer.push(this.strokeColor.r/255+" "+this.strokeColor.g/255+" "+this.strokeColor.b/255+" RG"),this.contentBuffer.push((t+r)*this.scaleFactor+" "+(i-e)*this.scaleFactor+" m"),this.contentBuffer.push((t+r)*this.scaleFactor+" "+(i-e+a)*this.scaleFactor+" "+(t+a)*this.scaleFactor+" "+(i-e+r)*this.scaleFactor+" "+t*this.scaleFactor+" "+(i-e+r)*this.scaleFactor+" c"),this.contentBuffer.push((t-a)*this.scaleFactor+" "+(i-e+r)*this.scaleFactor+" "+(t-r)*this.scaleFactor+" "+(i-e+a)*this.scaleFactor+" "+(t-r)*this.scaleFactor+" "+(i-e)*this.scaleFactor+" c"),this.contentBuffer.push((t-r)*this.scaleFactor+" "+(i-e-a)*this.scaleFactor+" "+(t-a)*this.scaleFactor+" "+(i-e-r)*this.scaleFactor+" "+t*this.scaleFactor+" "+(i-e-r)*this.scaleFactor+" c"),this.contentBuffer.push((t+a)*this.scaleFactor+" "+(i-e-r)*this.scaleFactor+" "+(t+r)*this.scaleFactor+" "+(i-e-a)*this.scaleFactor+" "+(t+r)*this.scaleFactor+" "+(i-e)*this.scaleFactor+" c"),this.contentBuffer.push(o)},addImage:function(t,e,r,n,i,a){var o=this;if("string"==typeof t&&0===t.indexOf("data:")){var s=t.split(",")[1],l=t.split(";")[0].split(":")[1],u="PNG";"image/jpeg"===l&&(u="JPEG");var c=atob(s);this.addImageRaw(c,u,r,n,i,a)}else if("string"==typeof t);else if(t instanceof HTMLCanvasElement){var h=t.toDataURL("image/png").split(",")[1],f=atob(h);this.addImageRaw(f,"PNG",r,n,i,a)}},addImageRaw:function(t,e,r,n,i,a){this.imageCounter++;var o=new N("image"+this.imageCounter);o.width=i,o.height=a;var s=this.currentPage.pageInfo.height/this.internalScaleFactor;if("JPEG"===e||"JPG"===e){o.filter="/DCTDecode",o.colorSpace="/DeviceRGB",o.bitsPerComponent=8;for(var l=0,u=0;u<t.length&&!(255===t.charCodeAt(u)&&192===t.charCodeAt(u+1));)u++;u+=5,o.height=256*t.charCodeAt(u)+t.charCodeAt(u+1),o.width=256*t.charCodeAt(u+2)+t.charCodeAt(u+3),o.stream.append(t)}else"PNG"===e&&this.decodePNG(o,t);this.objectList.addObject(o),this.resources.addImage("image"+this.imageCounter,o),this.contentBuffer.push("q"),this.contentBuffer.push(i*this.scaleFactor+" 0 0 "+a*this.scaleFactor+" "+r*this.scaleFactor+" "+(s-n-a)*this.scaleFactor+" cm"),this.contentBuffer.push("/image"+this.imageCounter+" Do"),this.contentBuffer.push("Q")},decodePNG:function(t,e){for(var r=new Uint8Array(e.length),n=0;n<e.length;n++)r[n]=e.charCodeAt(n);var i=8;if(137!==r[0]||80!==r[1]||78!==r[2]||71!==r[3])return;for(;i<r.length;){var a=256*(256*(256*r[i]+r[i+1])+r[i+2])+r[i+3],o=String.fromCharCode(r[i+4],r[i+5],r[i+6],r[i+7]);if("IHDR"===o){t.width=256*(256*(256*r[i+8]+r[i+9])+r[i+10])+r[i+11],t.height=256*(256*(256*r[i+12]+r[i+13])+r[i+14])+r[i+15];var s=r[i+16];t.bitsPerComponent=s;var l=r[i+17];0===l?t.colorSpace="/DeviceGray":2===l?t.colorSpace="/DeviceRGB":3===l?t.colorSpace="/Indexed":6===l&&(t.colorSpace="/DeviceRGB"),t.filter="/FlateDecode"}else if("IDAT"===o){for(var u=i+8,c=i+8+a,h="";u<c;u++)h+=String.fromCharCode(r[u]);t.stream.append(h)}else if("PLTE"===o){for(var f=i+8,d=i+8+a,p="";f<d;f++)p+=String.fromCharCode(r[f]);t.palette=p}else if("IEND"===o)break;i+=12+a}},splitTextToSize:function(t,e){for(var r=[],n=t.split(" "),i="",a=0;a<n.length;a++){var o=i+(i?" ":"")+n[a];this.getStringWidth(o)<=e?i=o:(i&&r.push(i),i=n[a])}return i&&r.push(i),r},getStringWidth:function(t){return t.length*this.currentFontSize*.5},save:function(t){this.finalizePage();for(var e=this.buildPdf(),r=new Blob([e],{type:"application/pdf"}),n=URL.createObjectURL(r),i=document.createElement("a"),a=t||"document.pdf",o=(new Date).getTime();document.getElementById("jspdf-download-"+o);)o++;i.id="jspdf-download-"+o,i.href=n,i.download=a,document.body.appendChild(i),i.click(),document.body.removeChild(i),URL.revokeObjectURL(n)},finalizePage:function(){if(this.currentPage){var t=this.contentBuffer.join("\\n");this.currentPage.stream.append(t),this.contentBuffer=[]}},buildPdf:function(){this.finalizePage();var t=[],e=0;t.push("%PDF-1.4"),t.push("%\\xe2\\xe3\\xcf\\xd3"),e=t.join("\\n").length+1;for(var r=[],n=1,i=0;i<this.pagesChildren.length;i++){var a=this.pagesChildren[i];r.push(e);var o=n+++" 0 obj\\n<</Type /Page /Parent 2 0 R /MediaBox [0 0 "+a.widthMM*this.scaleFactor+" "+a.heightMM*this.scaleFactor+"] /Contents "+(n+this.pagesChildren.length)+" 0 R /Resources <<";o+="/Font <<";for(var s in this.fonts)o+="/"+this.fonts[s].id+" "+(n+2*this.pagesChildren.length+Object.keys(this.fonts).indexOf(s)+1)+" 0 R ";o+=">> ";for(var l in o+="/XObject <<",this.resources.getImages())o+="/"+l+" "+(n+2*this.pagesChildren.length+Object.keys(this.fonts).length+Object.keys(this.resources.getImages()).indexOf(l)+1)+" 0 R ";o+=">> ",o+="/ProcSet [/PDF /Text /ImageB /ImageC /ImageI]",o+=">> >>\\nendobj",t.push(o),e+=o.length+1}r.push(e);var u=n+++" 0 obj\\n<</Type /Pages /Kids [";for(i=0;i<this.pagesChildren.length;i++)u+=(i+1)+" 0 R ";u+="] /Count "+this.pagesChildren.length+">>\\nendobj",t.push(u),e+=u.length+1;for(i=0;i<this.pagesChildren.length;i++){r.push(e);var c=this.pagesChildren[i].stream.getData(),h=n+++" 0 obj\\n<</Length "+c.length+">>\\nstream\\n"+c+"\\nendstream\\nendobj";t.push(h),e+=h.length+1}for(s in this.fonts)r.push(e),h=n+++" 0 obj\\n<</Type /Font /Subtype /Type1 /BaseFont /"+this.fonts[s].postScriptName+" /Encoding /WinAnsiEncoding>>\\nendobj",t.push(h),e+=h.length+1;for(l in this.resources.getImages()){r.push(e);var f=this.resources.getImage(l),d=f.stream.getData();h=n+++" 0 obj\\n<</Type /XObject /Subtype /Image /Width "+f.width+" /Height "+f.height+" /ColorSpace "+f.colorSpace+" /BitsPerComponent "+f.bitsPerComponent;f.filter&&(h+=" /Filter "+f.filter),h+=" /Length "+d.length+">>\\nstream\\n"+d+"\\nendstream\\nendobj",t.push(h),e+=h.length+1}r.push(e);var p=n+" 0 obj\\n<</Type /Catalog /Pages 2 0 R>>\\nendobj";t.push(p),e+=p.length+1;var g="xref\\n0 "+(n+1)+"\\n0000000000 65535 f \\n";for(i=0;i<r.length;i++)g+=String(r[i]).padStart(10,"0")+" 00000 n \\n";g+="trailer\\n<</Size "+(n+1)+" /Root "+n+" 0 R>>\\nstartxref\\n"+e+"\\n%%EOF",t.push(g);var m=t.join("\\n");return m}},t.jsPDF=W,Object.defineProperty(t,"__esModule",{value:!0})});

// QRCode.js library (minified) - QR code generation
!function(t){function e(t,e,r){this.mode=n.MODE_8BIT_BYTE,this.data=t,this.parsedData=[];for(var i=0,o=this.data.length;i<o;i++){var a=this.data.charCodeAt(i);a>65536?(this.parsedData[this.parsedData.length]=240|(1835008&a)>>>18,this.parsedData[this.parsedData.length]=128|(258048&a)>>>12,this.parsedData[this.parsedData.length]=128|(4032&a)>>>6,this.parsedData[this.parsedData.length]=128|63&a):a>2048?(this.parsedData[this.parsedData.length]=224|(61440&a)>>>12,this.parsedData[this.parsedData.length]=128|(4032&a)>>>6,this.parsedData[this.parsedData.length]=128|63&a):a>128?(this.parsedData[this.parsedData.length]=192|(1984&a)>>>6,this.parsedData[this.parsedData.length]=128|63&a):this.parsedData[this.parsedData.length]=a}this.parsedData.length!=this.data.length&&(this.parsedData.unshift(191),this.parsedData.unshift(187),this.parsedData.unshift(239))}function r(t,e){this.typeNumber=t,this.errorCorrectLevel=e,this.modules=null,this.moduleCount=0,this.dataCache=null,this.dataList=[]}function n(){this.x=0,this.y=0}function i(t,e){if(t.length==o)throw new Error(t.length+"/"+o);for(var r=0;r<t.length&&0==t[r];)r++;this.num=new Array(t.length-r+e);for(var n=0;n<t.length-r;n++)this.num[n]=t[n+r]}function o(){this.buffer=[],this.length=0}e.prototype={getLength:function(t){return this.parsedData.length},write:function(t){for(var e=0,r=this.parsedData.length;e<r;e++)t.put(this.parsedData[e],8)}},r.prototype={addData:function(t){var r=new e(t);this.dataList.push(r),this.dataCache=null},isDark:function(t,e){if(t<0||this.moduleCount<=t||e<0||this.moduleCount<=e)throw new Error(t+","+e);return this.modules[t][e]},getModuleCount:function(){return this.moduleCount},make:function(){this.makeImpl(!1,this.getBestMaskPattern())},makeImpl:function(t,e){this.moduleCount=4*this.typeNumber+17,this.modules=new Array(this.moduleCount);for(var r=0;r<this.moduleCount;r++){this.modules[r]=new Array(this.moduleCount);for(var n=0;n<this.moduleCount;n++)this.modules[r][n]=null}this.setupPositionProbePattern(0,0),this.setupPositionProbePattern(this.moduleCount-7,0),this.setupPositionProbePattern(0,this.moduleCount-7),this.setupPositionAdjustPattern(),this.setupTimingPattern(),this.setupTypeInfo(t,e),this.typeNumber>=7&&this.setupTypeNumber(t),null==this.dataCache&&(this.dataCache=r.createData(this.typeNumber,this.errorCorrectLevel,this.dataList)),this.mapData(this.dataCache,e)},setupPositionProbePattern:function(t,e){for(var r=-1;r<=7;r++)if(!(t+r<=-1||this.moduleCount<=t+r))for(var n=-1;n<=7;n++)e+n<=-1||this.moduleCount<=e+n||(this.modules[t+r][e+n]=0<=r&&r<=6&&(0==n||6==n)||0<=n&&n<=6&&(0==r||6==r)||2<=r&&r<=4&&2<=n&&n<=4)},getBestMaskPattern:function(){for(var t=0,e=0,r=0;r<8;r++){this.makeImpl(!0,r);var n=a.getLostPoint(this);(0==r||t>n)&&(t=n,e=r)}return e},setupTimingPattern:function(){for(var t=8;t<this.moduleCount-8;t++)null==this.modules[t][6]&&(this.modules[t][6]=t%2==0),null==this.modules[6][t]&&(this.modules[6][t]=t%2==0)},setupPositionAdjustPattern:function(){for(var t=a.getPatternPosition(this.typeNumber),e=0;e<t.length;e++)for(var r=0;r<t.length;r++){var n=t[e],i=t[r];if(null==this.modules[n][i])for(var o=-2;o<=2;o++)for(var s=-2;s<=2;s++)this.modules[n+o][i+s]=-2==o||2==o||-2==s||2==s||0==o&&0==s}},setupTypeNumber:function(t){for(var e=a.getBCHTypeNumber(this.typeNumber),r=0;r<18;r++){var n=!t&&1==(e>>r&1);this.modules[Math.floor(r/3)][r%3+this.moduleCount-8-3]=n}for(r=0;r<18;r++){n=!t&&1==(e>>r&1);this.modules[r%3+this.moduleCount-8-3][Math.floor(r/3)]=n}},setupTypeInfo:function(t,e){for(var r=this.errorCorrectLevel<<3|e,n=a.getBCHTypeInfo(r),i=0;i<15;i++){var o=!t&&1==(n>>i&1);i<6?this.modules[i][8]=o:i<8?this.modules[i+1][8]=o:this.modules[this.moduleCount-15+i][8]=o}for(i=0;i<15;i++){o=!t&&1==(n>>i&1);i<8?this.modules[8][this.moduleCount-i-1]=o:i<9?this.modules[8][15-i-1+1]=o:this.modules[8][15-i-1]=o}this.modules[this.moduleCount-8][8]=!t},mapData:function(t,e){for(var r=-1,n=this.moduleCount-1,i=7,o=0,s=this.moduleCount-1;s>0;s-=2)for(6==s&&s--;;){for(var l=0;l<2;l++)if(null==this.modules[n][s-l]){var u=!1;o<t.length&&(u=1==(t[o]>>>i&1)),a.getMask(e,n,s-l)&&(u=!u),this.modules[n][s-l]=u,-1==--i&&(o++,i=7)}if((n+=r)<0||this.moduleCount<=n){n-=r,r=-r;break}}}},r.PAD0=236,r.PAD1=17,r.createData=function(t,e,n){for(var s=a.getRSBlocks(t,e),l=new o,u=0;u<n.length;u++){var h=n[u];l.put(h.mode,4),l.put(h.getLength(),a.getLengthInBits(h.mode,t)),h.write(l)}var c=0;for(u=0;u<s.length;u++)c+=s[u].dataCount;if(l.getLengthInBits()>8*c)throw new Error("code length overflow. ("+l.getLengthInBits()+">"+8*c+")");for(l.getLengthInBits()+4<=8*c&&l.put(0,4);l.getLengthInBits()%8!=0;)l.putBit(!1);for(;!(l.getLengthInBits()>=8*c||(l.put(r.PAD0,8),l.getLengthInBits()>=8*c));)l.put(r.PAD1,8);return r.createBytes(l,s)},r.createBytes=function(t,e){for(var r=0,n=0,o=0,s=new Array(e.length),l=new Array(e.length),u=0;u<e.length;u++){var h=e[u].dataCount,c=e[u].totalCount-h;n=Math.max(n,h),o=Math.max(o,c),s[u]=new Array(h);for(var d=0;d<s[u].length;d++)s[u][d]=255&t.buffer[d+r];r+=h;var f=a.getErrorCorrectPolynomial(c),p=new i(s[u],f.getLength()-1).mod(f);l[u]=new Array(f.getLength()-1);for(d=0;d<l[u].length;d++){var g=d+p.getLength()-l[u].length;l[u][d]=g>=0?p.get(g):0}}var m=0;for(d=0;d<e.length;d++)m+=e[d].totalCount;var v=new Array(m),b=0;for(d=0;d<n;d++)for(u=0;u<e.length;u++)d<s[u].length&&(v[b++]=s[u][d]);for(d=0;d<o;d++)for(u=0;u<e.length;u++)d<l[u].length&&(v[b++]=l[u][d]);return v};for(var a={PATTERN_POSITION_TABLE:[[],[6,18],[6,22],[6,26],[6,30],[6,34],[6,22,38],[6,24,42],[6,26,46],[6,28,50],[6,30,54],[6,32,58],[6,34,62],[6,26,46,66],[6,26,48,70],[6,26,50,74],[6,30,54,78],[6,30,56,82],[6,30,58,86],[6,34,62,90],[6,28,50,72,94],[6,26,50,74,98],[6,30,54,78,102],[6,28,54,80,106],[6,32,58,84,110],[6,30,58,86,114],[6,34,62,90,118],[6,26,50,74,98,122],[6,30,54,78,102,126],[6,26,52,78,104,130],[6,30,56,82,108,134],[6,34,60,86,112,138],[6,30,58,86,114,142],[6,34,62,90,118,146],[6,30,54,78,102,126,150],[6,24,50,76,102,128,154],[6,28,54,80,106,132,158],[6,32,58,84,110,136,162],[6,26,54,82,110,138,166],[6,30,58,86,114,142,170]],G15:1335,G18:7973,G15_MASK:21522,getBCHTypeInfo:function(t){for(var e=t<<10;a.getBCHDigit(e)-a.getBCHDigit(a.G15)>=0;)e^=a.G15<<a.getBCHDigit(e)-a.getBCHDigit(a.G15);return(t<<10|e)^a.G15_MASK},getBCHTypeNumber:function(t){for(var e=t<<12;a.getBCHDigit(e)-a.getBCHDigit(a.G18)>=0;)e^=a.G18<<a.getBCHDigit(e)-a.getBCHDigit(a.G18);return t<<12|e},getBCHDigit:function(t){for(var e=0;0!=t;)e++,t>>>=1;return e},getPatternPosition:function(t){return a.PATTERN_POSITION_TABLE[t-1]},getMask:function(t,e,r){switch(t){case 0:return(e+r)%2==0;case 1:return e%2==0;case 2:return r%3==0;case 3:return(e+r)%3==0;case 4:return(Math.floor(e/2)+Math.floor(r/3))%2==0;case 5:return e*r%2+e*r%3==0;case 6:return(e*r%2+e*r%3)%2==0;case 7:return(e*r%3+(e+r)%2)%2==0;default:throw new Error("bad maskPattern:"+t)}},getErrorCorrectPolynomial:function(t){for(var e=new i([1],0),r=0;r<t;r++)e=e.multiply(new i([1,s.gexp(r)],0));return e},getLengthInBits:function(t,e){if(1<=e&&e<10)switch(t){case 1:return 10;case 2:return 9;case 4:case 8:return 8;default:throw new Error("mode:"+t)}else if(e<27)switch(t){case 1:return 12;case 2:return 11;case 4:return 16;case 8:return 10;default:throw new Error("mode:"+t)}else{if(!(e<41))throw new Error("type:"+e);switch(t){case 1:return 14;case 2:return 13;case 4:return 16;case 8:return 12;default:throw new Error("mode:"+t)}}},getLostPoint:function(t){for(var e=t.getModuleCount(),r=0,n=0;n<e;n++)for(var i=0;i<e;i++){for(var o=0,a=t.isDark(n,i),s=-1;s<=1;s++)if(!(n+s<0||e<=n+s))for(var l=-1;l<=1;l++)i+l<0||e<=i+l||0==s&&0==l||a==t.isDark(n+s,i+l)&&o++;o>5&&(r+=3+o-5)}for(n=0;n<e-1;n++)for(i=0;i<e-1;i++){var u=0;t.isDark(n,i)&&u++,t.isDark(n+1,i)&&u++,t.isDark(n,i+1)&&u++,t.isDark(n+1,i+1)&&u++,0!=u&&4!=u||(r+=3)}for(n=0;n<e;n++)for(i=0;i<e-6;i++)t.isDark(n,i)&&!t.isDark(n,i+1)&&t.isDark(n,i+2)&&t.isDark(n,i+3)&&t.isDark(n,i+4)&&!t.isDark(n,i+5)&&t.isDark(n,i+6)&&(r+=40);for(i=0;i<e;i++)for(n=0;n<e-6;n++)t.isDark(n,i)&&!t.isDark(n+1,i)&&t.isDark(n+2,i)&&t.isDark(n+3,i)&&t.isDark(n+4,i)&&!t.isDark(n+5,i)&&t.isDark(n+6,i)&&(r+=40);var h=0;for(i=0;i<e;i++)for(n=0;n<e;n++)t.isDark(n,i)&&h++;return r+=10*(Math.abs(100*h/e/e-50)/5)},getRSBlocks:function(t,e){var r=a.getRsBlockTable(t,e);if(r==o)throw new Error("bad rs block @ typeNumber:"+t+"/errorCorrectLevel:"+e);for(var n=r.length/3,i=[],s=0;s<n;s++)for(var l=r[3*s+0],u=r[3*s+1],h=r[3*s+2],c=0;c<l;c++)i.push({totalCount:u,dataCount:h});return i},getRsBlockTable:function(t,e){switch(e){case 1:return a.RS_BLOCK_TABLE[4*(t-1)+0];case 0:return a.RS_BLOCK_TABLE[4*(t-1)+1];case 3:return a.RS_BLOCK_TABLE[4*(t-1)+2];case 2:return a.RS_BLOCK_TABLE[4*(t-1)+3];default:return o}},RS_BLOCK_TABLE:[[1,26,19],[1,26,16],[1,26,13],[1,26,9],[1,44,34],[1,44,28],[1,44,22],[1,44,16],[1,70,55],[1,70,44],[2,35,17],[2,35,13],[1,100,80],[2,50,32],[2,50,24],[4,25,9],[1,134,108],[2,67,43],[2,33,15,2,34,16],[2,33,11,2,34,12],[2,86,68],[4,43,27],[4,43,19],[4,43,15],[2,98,78],[4,49,31],[2,32,14,4,33,15],[4,39,13,1,40,14],[2,121,97],[2,60,38,2,61,39],[4,40,18,2,41,19],[4,40,14,2,41,15],[2,146,116],[3,58,36,2,59,37],[4,36,16,4,37,17],[4,36,12,4,37,13],[2,86,68,2,87,69],[4,69,43,1,70,44],[6,43,19,2,44,20],[6,43,15,2,44,16],[4,101,81],[1,80,50,4,81,51],[4,50,22,4,51,23],[3,36,12,8,37,13],[2,116,92,2,117,93],[6,58,36,2,59,37],[4,46,20,6,47,21],[7,42,14,4,43,15],[4,133,107],[8,59,37,1,60,38],[8,44,20,4,45,21],[12,33,11,4,34,12],[3,145,115,1,146,116],[4,64,40,5,65,41],[11,36,16,5,37,17],[11,36,12,5,37,13],[5,109,87,1,110,88],[5,65,41,5,66,42],[5,54,24,7,55,25],[11,36,12],[5,122,98,1,123,99],[7,73,45,3,74,46],[15,43,19,2,44,20],[3,45,15,13,46,16],[1,135,107,5,136,108],[10,74,46,1,75,47],[1,50,22,15,51,23],[2,42,14,17,43,15],[5,150,120,1,151,121],[9,69,43,4,70,44],[17,50,22,1,51,23],[2,42,14,19,43,15],[3,141,113,4,142,114],[3,70,44,11,71,45],[17,47,21,4,48,22],[9,39,13,16,40,14],[3,135,107,5,136,108],[3,67,41,13,68,42],[15,54,24,5,55,25],[15,43,15,10,44,16],[4,144,116,4,145,117],[17,68,42],[17,50,22,6,51,23],[19,46,16,6,47,17],[2,139,111,7,140,112],[17,74,46],[7,54,24,16,55,25],[34,37,13],[4,151,121,5,152,122],[4,75,47,14,76,48],[11,54,24,14,55,25],[16,45,15,14,46,16],[6,147,117,4,148,118],[6,73,45,14,74,46],[11,54,24,16,55,25],[30,46,16,2,47,17],[8,132,106,4,133,107],[8,75,47,13,76,48],[7,54,24,22,55,25],[22,45,15,13,46,16],[10,142,114,2,143,115],[19,74,46,4,75,47],[28,50,22,6,51,23],[33,46,16,4,47,17],[8,152,122,4,153,123],[22,73,45,3,74,46],[8,53,23,26,54,24],[12,45,15,28,46,16],[3,147,117,10,148,118],[3,73,45,23,74,46],[4,54,24,31,55,25],[11,45,15,31,46,16],[7,146,116,7,147,117],[21,73,45,7,74,46],[1,53,23,37,54,24],[19,45,15,26,46,16],[5,145,115,10,146,116],[19,75,47,10,76,48],[15,54,24,25,55,25],[23,45,15,25,46,16],[13,145,115,3,146,116],[2,74,46,29,75,47],[42,54,24,1,55,25],[23,45,15,28,46,16],[17,145,115],[10,74,46,23,75,47],[10,54,24,35,55,25],[19,45,15,35,46,16],[17,145,115,1,146,116],[14,74,46,21,75,47],[29,54,24,19,55,25],[11,45,15,46,46,16],[13,145,115,6,146,116],[14,74,46,23,75,47],[44,54,24,7,55,25],[59,46,16,1,47,17],[12,151,121,7,152,122],[12,75,47,26,76,48],[39,54,24,14,55,25],[22,45,15,41,46,16],[6,151,121,14,152,122],[6,75,47,34,76,48],[46,54,24,10,55,25],[2,45,15,64,46,16],[17,152,122,4,153,123],[29,74,46,14,75,47],[49,54,24,10,55,25],[24,45,15,46,46,16],[4,152,122,18,153,123],[13,74,46,32,75,47],[48,54,24,14,55,25],[42,45,15,32,46,16],[20,147,117,4,148,118],[40,75,47,7,76,48],[43,54,24,22,55,25],[10,45,15,67,46,16],[19,148,118,6,149,119],[18,75,47,31,76,48],[34,54,24,34,55,25],[20,45,15,61,46,16]]},s={glog:function(t){if(t<1)throw new Error("glog("+t+")");return s.LOG_TABLE[t]},gexp:function(t){for(;t<0;)t+=255;for(;t>=256;)t-=255;return s.EXP_TABLE[t]},EXP_TABLE:new Array(256),LOG_TABLE:new Array(256)},l=0;l<8;l++)s.EXP_TABLE[l]=1<<l;for(l=8;l<256;l++)s.EXP_TABLE[l]=s.EXP_TABLE[l-4]^s.EXP_TABLE[l-5]^s.EXP_TABLE[l-6]^s.EXP_TABLE[l-8];for(l=0;l<255;l++)s.LOG_TABLE[s.EXP_TABLE[l]]=l;i.prototype={get:function(t){return this.num[t]},getLength:function(){return this.num.length},multiply:function(t){for(var e=new Array(this.getLength()+t.getLength()-1),r=0;r<this.getLength();r++)for(var n=0;n<t.getLength();n++)e[r+n]^=s.gexp(s.glog(this.get(r))+s.glog(t.get(n)));return new i(e,0)},mod:function(t){if(this.getLength()-t.getLength()<0)return this;for(var e=s.glog(this.get(0))-s.glog(t.get(0)),r=new Array(this.getLength()),n=0;n<this.getLength();n++)r[n]=this.get(n);for(n=0;n<t.getLength();n++)r[n]^=s.gexp(s.glog(t.get(n))+e);return new i(r,0).mod(t)}},o.prototype={get:function(t){var e=Math.floor(t/8);return 1==(this.buffer[e]>>>7-t%8&1)},put:function(t,e){for(var r=0;r<e;r++)this.putBit(1==(t>>>e-r-1&1))},getLengthInBits:function(){return this.length},putBit:function(t){var e=Math.floor(this.length/8);this.buffer.length<=e&&this.buffer.push(0),t&&(this.buffer[e]|=128>>>this.length%8),this.length++}};var n={MODE_NUMBER:1,MODE_ALPHA_NUM:2,MODE_8BIT_BYTE:4,MODE_KANJI:8};function u(t,e){this.typeNumber=t,this.errorCorrectLevel=e,this.modules=null,this.moduleCount=0,this.dataCache=null,this.dataList=[],this._el=null,this._oContext=null}u.prototype={makeCode:function(t){this.addData(t),this.make()},addData:function(t){var n=new e(t);this.dataList.push(n),this.dataCache=null},isDark:function(t,e){if(t<0||this.moduleCount<=t||e<0||this.moduleCount<=e)throw new Error(t+","+e);return this.modules[t][e]},getModuleCount:function(){return this.moduleCount},make:function(){if(this.typeNumber<1){var t=1;for(t=1;t<40;t++){for(var e=a.getRSBlocks(t,this.errorCorrectLevel),r=new o,n=0,i=0;i<e.length;i++)n+=e[i].dataCount;for(i=0;i<this.dataList.length;i++){var s=this.dataList[i];r.put(s.mode,4),r.put(s.getLength(),a.getLengthInBits(s.mode,t)),s.write(r)}if(r.getLengthInBits()<=8*n)break}this.typeNumber=t}this.makeImpl(!1,this.getBestMaskPattern())},makeImpl:function(t,e){this.moduleCount=4*this.typeNumber+17,this.modules=new Array(this.moduleCount);for(var r=0;r<this.moduleCount;r++){this.modules[r]=new Array(this.moduleCount);for(var n=0;n<this.moduleCount;n++)this.modules[r][n]=null}this.setupPositionProbePattern(0,0),this.setupPositionProbePattern(this.moduleCount-7,0),this.setupPositionProbePattern(0,this.moduleCount-7),this.setupPositionAdjustPattern(),this.setupTimingPattern(),this.setupTypeInfo(t,e),this.typeNumber>=7&&this.setupTypeNumber(t),null==this.dataCache&&(this.dataCache=r.createData(this.typeNumber,this.errorCorrectLevel,this.dataList)),this.mapData(this.dataCache,e)},setupPositionProbePattern:function(t,e){for(var r=-1;r<=7;r++)if(!(t+r<=-1||this.moduleCount<=t+r))for(var n=-1;n<=7;n++)e+n<=-1||this.moduleCount<=e+n||(this.modules[t+r][e+n]=0<=r&&r<=6&&(0==n||6==n)||0<=n&&n<=6&&(0==r||6==r)||2<=r&&r<=4&&2<=n&&n<=4)},getBestMaskPattern:function(){for(var t=0,e=0,r=0;r<8;r++){this.makeImpl(!0,r);var n=a.getLostPoint(this);(0==r||t>n)&&(t=n,e=r)}return e},setupTimingPattern:function(){for(var t=8;t<this.moduleCount-8;t++)null==this.modules[t][6]&&(this.modules[t][6]=t%2==0),null==this.modules[6][t]&&(this.modules[6][t]=t%2==0)},setupPositionAdjustPattern:function(){for(var t=a.getPatternPosition(this.typeNumber),e=0;e<t.length;e++)for(var r=0;r<t.length;r++){var n=t[e],i=t[r];if(null==this.modules[n][i])for(var o=-2;o<=2;o++)for(var s=-2;s<=2;s++)this.modules[n+o][i+s]=-2==o||2==o||-2==s||2==s||0==o&&0==s}},setupTypeNumber:function(t){for(var e=a.getBCHTypeNumber(this.typeNumber),r=0;r<18;r++){var n=!t&&1==(e>>r&1);this.modules[Math.floor(r/3)][r%3+this.moduleCount-8-3]=n}for(r=0;r<18;r++){n=!t&&1==(e>>r&1);this.modules[r%3+this.moduleCount-8-3][Math.floor(r/3)]=n}},setupTypeInfo:function(t,e){for(var r=this.errorCorrectLevel<<3|e,n=a.getBCHTypeInfo(r),i=0;i<15;i++){var o=!t&&1==(n>>i&1);i<6?this.modules[i][8]=o:i<8?this.modules[i+1][8]=o:this.modules[this.moduleCount-15+i][8]=o}for(i=0;i<15;i++){o=!t&&1==(n>>i&1);i<8?this.modules[8][this.moduleCount-i-1]=o:i<9?this.modules[8][15-i-1+1]=o:this.modules[8][15-i-1]=o}this.modules[this.moduleCount-8][8]=!t},mapData:function(t,e){for(var r=-1,n=this.moduleCount-1,i=7,o=0,s=this.moduleCount-1;s>0;s-=2)for(6==s&&s--;;){for(var l=0;l<2;l++)if(null==this.modules[n][s-l]){var u=!1;o<t.length&&(u=1==(t[o]>>>i&1)),a.getMask(e,n,s-l)&&(u=!u),this.modules[n][s-l]=u,-1==--i&&(o++,i=7)}if((n+=r)<0||this.moduleCount<=n){n-=r,r=-r;break}}}},t.QRCode=u,t.QRCode.CorrectLevel={L:1,M:0,Q:3,H:2},"undefined"!=typeof module&&module.exports?module.exports=t.QRCode:"function"==typeof define&&define.amd&&define([],function(){return t.QRCode})}(this);

// QRCode toCanvas helper
(function(){if(typeof QRCode!=="undefined"){QRCode.toCanvas=function(canvas,text,options,callback){if(typeof options==="function"){callback=options;options={}}options=options||{};try{var qr=new QRCode(-1,QRCode.CorrectLevel.M);qr.addData(text);qr.make();var size=options.width||128;var margin=options.margin||1;var moduleCount=qr.getModuleCount();var cellSize=(size-2*margin*cellSize)/moduleCount;cellSize=Math.floor((size-2*margin)/moduleCount);var actualSize=cellSize*moduleCount+2*margin;canvas.width=actualSize;canvas.height=actualSize;var ctx=canvas.getContext("2d");ctx.fillStyle=options.color&&options.color.light||"#ffffff";ctx.fillRect(0,0,actualSize,actualSize);ctx.fillStyle=options.color&&options.color.dark||"#000000";for(var r=0;r<moduleCount;r++){for(var c=0;c<moduleCount;c++){if(qr.isDark(r,c)){ctx.fillRect(margin+c*cellSize,margin+r*cellSize,cellSize,cellSize)}}}if(callback)callback(null)}catch(e){if(callback)callback(e)}}}})();

// ===== EMBEDDED DATA =====
const DATA = ${stepsJSON};

// Parse dates safely
try {
  DATA.generatedAt = new Date(DATA.generatedAt);
  DATA.previousSteps.forEach(function(s) {
    s.completedAt = new Date(s.completedAt);
    if (s.annotations) {
      s.annotations.forEach(function(a) { a.createdAt = new Date(a.createdAt); });
    }
  });
  DATA.allAnnotations.forEach(function(a) { a.createdAt = new Date(a.createdAt); });
} catch(e) { console.warn('Date parsing error:', e); }

// ===== STATE =====
var state = {
  activeTab: 'position',
  myAnnotations: [],
  currentAnnotationType: 'comment',
  annotateMode: false,
  zoom: 100,
  currentPage: 1,
  totalPages: 1,
  returnData: null,
  decisionMade: false,
  signatureDrawing: false,
  signatureCtx: null,
  signatureHasContent: false,
  replyToId: null,
  mobileDrawerExpanded: false,
  sigSource: 'draw',
  sigImportedImage: null,
  sigPlaced: false,
  sigPosition: { x: 50, y: 80 },
  sigDragging: false,
  sigDragOffset: { x: 0, y: 0 },
  sigResizing: false,
  sigResizeOrigin: { x: 0, y: 0, w: 0, h: 0 },
  sigScale: 1.0,
  // Initials (Paraphe) state
  initialsDrawing: false,
  initialsCtx: null,
  initialsHasContent: false,
  initialsSource: 'draw',
  initialsImportedImage: null
};

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
  try {
    renderDocument();
    renderAnnotationOverlay();
    setupSignature();
    setupInitials();
    loadSavedSignature();
    loadSavedInitials();
    setupSigSecurity();
    setupSigDragResize();
    setupCharCounters();
    setupMobileDrawer();
    setupKeyboard();
    setupResizeHandler();
    verifyDocumentLock();
    // Attach viewport click (avoids inline onclick timing issues in srcdoc iframes)
    var vp = document.getElementById('viewerViewport');
    if (vp) vp.addEventListener('click', function(e) { handleViewportClick(e); });
  } catch(e) { console.error('Init error:', e); }
});

// ===== TAB SYSTEM =====
function switchTab(tab, isMobile) {
  state.activeTab = tab;

  // Update desktop tabs
  var desktopTabs = document.querySelectorAll('.side-panel .tab-btn');
  desktopTabs.forEach(function(btn) {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tab);
  });
  var panes = document.querySelectorAll('.tab-pane');
  panes.forEach(function(pane) {
    pane.classList.toggle('active', pane.id === 'tab' + tab.charAt(0).toUpperCase() + tab.slice(1));
  });

  // Update mobile tabs
  var mobileTabs = document.querySelectorAll('.mobile-tab-bar .tab-btn');
  mobileTabs.forEach(function(btn) {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tab);
  });

  // Clone content to mobile drawer
  if (isMobile) {
    var activePane = document.querySelector('.tab-pane.active');
    if (activePane) {
      var drawer = document.getElementById('mobileDrawerContent');
      drawer.innerHTML = activePane.innerHTML;
    }
    expandMobileDrawer();
  }
}

// ===== DOCUMENT RENDERING =====
function renderDocument() {
  var docRender = document.getElementById('docRender');
  var type = DATA.document.type;
  var b64 = DATA.document.content;

  if (type === 'pdf' || DATA.document.previewContent) {
    var pdfData = DATA.document.previewContent || b64;
    docRender.innerHTML = '<iframe src="data:application/pdf;base64,' + pdfData + '" style="width:800px;height:1100px;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,0.1)" id="pdfFrame"></iframe>';
  } else if (type === 'image') {
    var ext = DATA.document.name.split('.').pop().toLowerCase();
    var mimeMap = {jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',gif:'image/gif',webp:'image/webp'};
    var mime = mimeMap[ext] || 'image/png';
    docRender.innerHTML = '<img src="data:' + mime + ';base64,' + b64 + '" alt="' + escapeHtml(DATA.document.name) + '" id="docImage" onload="onImageLoad()" />';
  } else if (type === 'text') {
    try {
      var text = atob(b64);
      docRender.innerHTML = '<pre>' + escapeHtml(text) + '</pre>';
      countTextPages(text);
    } catch(e) {
      docRender.innerHTML = '<div class="viewer-fallback"><p style="font-size:48px;margin-bottom:16px">&#128196;</p><p>Impossible d\\'afficher le contenu.</p></div>';
    }
  } else {
    docRender.innerHTML = '<div class="viewer-fallback"><p style="font-size:48px;margin-bottom:16px">&#128196;</p><p style="font-size:16px;font-weight:400">' + escapeHtml(DATA.document.name) + '</p><p style="color:#737373;margin-top:8px">Aper\\u00e7u non disponible pour ce format.</p><p style="margin-top:16px"><a href="data:application/octet-stream;base64,' + b64 + '" download="' + escapeHtml(DATA.document.name) + '" class="btn btn-primary">T\\u00e9l\\u00e9charger</a></p></div>';
  }
}

function onImageLoad() {
  state.totalPages = 1;
  updatePageDisplay();
}

function countTextPages(text) {
  var lines = text.split('\\n').length;
  state.totalPages = Math.max(1, Math.ceil(lines / 50));
  updatePageDisplay();
}

// ===== ZOOM =====
function zoomIn() {
  if (state.zoom >= 400) return;
  state.zoom = Math.min(400, state.zoom + 25);
  applyZoom();
}

function zoomOut() {
  if (state.zoom <= 25) return;
  state.zoom = Math.max(25, state.zoom - 25);
  applyZoom();
}

function fitToWidth() {
  var viewport = document.getElementById('viewerViewport');
  var content = document.getElementById('viewerContent');
  content.style.transform = 'none';
  var vw = viewport.clientWidth - 40;
  var cw = content.scrollWidth;
  if (cw > 0) {
    state.zoom = Math.round((vw / cw) * 100);
  }
  applyZoom();
}

function fitToPage() {
  state.zoom = 100;
  applyZoom();
}

function applyZoom() {
  var content = document.getElementById('viewerContent');
  content.style.transform = 'scale(' + (state.zoom / 100) + ')';
  document.getElementById('zoomDisplay').textContent = state.zoom + '%';
}

// ===== PAGE NAVIGATION =====
function prevPage() {
  if (state.currentPage > 1) {
    state.currentPage--;
    updatePageDisplay();
    scrollToPage();
  }
}

function nextPage() {
  if (state.currentPage < state.totalPages) {
    state.currentPage++;
    updatePageDisplay();
    scrollToPage();
  }
}

function goToPage(val) {
  var p = parseInt(val, 10);
  if (isNaN(p) || p < 1) p = 1;
  if (p > state.totalPages) p = state.totalPages;
  state.currentPage = p;
  updatePageDisplay();
  scrollToPage();
}

function updatePageDisplay() {
  document.getElementById('pageInput').value = state.currentPage;
  document.getElementById('pageTotal').textContent = '/ ' + state.totalPages;
}

function scrollToPage() {
  // For text docs, scroll to approximate position
  var viewport = document.getElementById('viewerViewport');
  var content = document.getElementById('viewerContent');
  var ratio = (state.currentPage - 1) / Math.max(1, state.totalPages - 1);
  viewport.scrollTop = ratio * (content.scrollHeight - viewport.clientHeight);
}

// ===== ANNOTATION SYSTEM =====
function toggleAnnotateMode() {
  state.annotateMode = !state.annotateMode;
  var btn = document.getElementById('btnAnnotateMode');
  btn.classList.toggle('active', state.annotateMode);
  var viewport = document.getElementById('viewerViewport');
  viewport.style.cursor = state.annotateMode ? 'crosshair' : 'default';
}

function handleViewportClick(e) {
  // Ignore clicks from signature placement overlay
  if (e.target.closest && e.target.closest('.sig-placement-overlay, .sig-draggable')) return;
  if (state.sigDragging) return;
  if (!state.annotateMode) return;
  var content = document.getElementById('viewerContent');
  var rect = content.getBoundingClientRect();
  var x = ((e.clientX - rect.left) / rect.width * 100).toFixed(1);
  var y = ((e.clientY - rect.top) / rect.height * 100).toFixed(1);

  // For pin and highlight, create annotation immediately on click
  if (state.currentAnnotationType === 'pin' || state.currentAnnotationType === 'highlight') {
    var textArea = document.getElementById('annotationText');
    var text = (textArea && textArea.value.trim()) || (state.currentAnnotationType === 'pin' ? 'Point d\\u0027attention' : 'Zone surlign\\u00e9e');
    var color = getParticipantColor(DATA.workflow.currentStepIndex);
    var ann = {
      id: generateUUID(),
      stepId: DATA.currentStep.id,
      participantName: DATA.currentStep.participant.name,
      participantRole: DATA.currentStep.role,
      type: state.currentAnnotationType,
      content: text,
      position: { page: state.currentPage, x: parseFloat(x), y: parseFloat(y) },
      color: color,
      createdAt: new Date(),
      replyTo: undefined
    };
    state.myAnnotations.push(ann);
    if (textArea) { textArea.value = ''; document.getElementById('annotationCharCount').textContent = '0'; }
    renderMyAnnotations();
    renderAnnotationOverlay();
    switchTab('notes', false);
    return;
  }

  // For comment, switch to notes tab and let user type
  switchTab('notes', false);
  var textArea = document.getElementById('annotationText');
  if (textArea) {
    textArea.dataset.posX = x;
    textArea.dataset.posY = y;
    textArea.focus();
    textArea.placeholder = 'Annotation \\u00e0 la position (' + x + '%, ' + y + '%)...';
  }
}

function setAnnotationType(type, btn) {
  state.currentAnnotationType = type;
  var btns = document.querySelectorAll('.note-type-btn');
  btns.forEach(function(b) { b.classList.toggle('active', b === btn); });
  // Auto-enable annotate mode so user can click on document
  if (!state.annotateMode) {
    toggleAnnotateMode();
  }
}

function saveAnnotation() {
  var textArea = document.getElementById('annotationText');
  var text = textArea.value.trim();
  if (!text) return;

  var color = getParticipantColor(DATA.workflow.currentStepIndex);
  var posX = parseFloat(textArea.dataset.posX) || 0;
  var posY = parseFloat(textArea.dataset.posY) || 0;

  var ann = {
    id: generateUUID(),
    stepId: DATA.currentStep.id,
    participantName: DATA.currentStep.participant.name,
    participantRole: DATA.currentStep.role,
    type: state.currentAnnotationType,
    content: text,
    position: { page: state.currentPage, x: posX, y: posY },
    color: color,
    createdAt: new Date(),
    replyTo: state.replyToId || undefined
  };

  state.myAnnotations.push(ann);
  textArea.value = '';
  textArea.dataset.posX = '';
  textArea.dataset.posY = '';
  textArea.placeholder = 'Saisissez votre annotation...';
  state.replyToId = null;
  document.getElementById('annotationCharCount').textContent = '0';
  renderMyAnnotations();
  renderAnnotationOverlay();
}

function removeAnnotation(idx) {
  state.myAnnotations.splice(idx, 1);
  renderMyAnnotations();
  renderAnnotationOverlay();
}

function removeAllAnnotations() {
  if (state.myAnnotations.length === 0) return;
  if (!confirm('Supprimer toutes vos annotations ?')) return;
  state.myAnnotations = [];
  renderMyAnnotations();
  renderAnnotationOverlay();
}

function undoLastAnnotation() {
  if (state.myAnnotations.length === 0) return;
  state.myAnnotations.pop();
  renderMyAnnotations();
  renderAnnotationOverlay();
}

function renderMyAnnotations() {
  var container = document.getElementById('myAnnotationsList');
  if (!container) return;
  if (state.myAnnotations.length === 0) { container.innerHTML = ''; return; }

  var color = getParticipantColor(DATA.workflow.currentStepIndex);
  var html = '<div class="my-notes-header">';
  html += '<span class="my-notes-title">Vos annotations (' + state.myAnnotations.length + ')</span>';
  html += '<div class="my-notes-actions">';
  html += '<button class="btn-undo" onclick="undoLastAnnotation()" title="Annuler la derni\\u00e8re">&#x21B6; Annuler</button>';
  html += '<button class="btn-clear-all" onclick="removeAllAnnotations()" title="Tout effacer">&#x1F5D1; Tout effacer</button>';
  html += '</div></div>';

  state.myAnnotations.forEach(function(ann, idx) {
    var typeLabel = {comment:'Commentaire',highlight:'Surlignage',pin:'\\u00c9pingle'}[ann.type] || ann.type;
    var typeIcon = {comment:'\\u{1F4AC}',highlight:'\\u{1F7E8}',pin:'\\u{1F4CC}'}[ann.type] || '';
    html += '<div class="my-note-item" data-ann-id="' + ann.id + '" style="border-left-color:' + color + ';background:' + color + '10">';
    html += '<div class="my-note-content">';
    html += '<div class="text">' + typeIcon + ' ' + escapeHtml(ann.content) + '</div>';
    html += '<div class="note-meta">p.' + ann.position.page + ' \\u2014 ' + typeLabel;
    if (ann.replyTo) html += ' (r\\u00e9ponse)';
    html += ' <a class="goto-link" onclick="scrollDocumentToAnnotation(\\'' + ann.id + '\\',' + ann.position.page + ')">Voir \\u2192</a>';
    html += '</div>';
    html += '</div>';
    html += '<button class="delete-note-btn" onclick="event.stopPropagation();removeAnnotation(' + idx + ')" title="Supprimer">&#x1F5D1;</button>';
    html += '</div>';
  });

  container.innerHTML = html;

  // Attach hover handlers for bidirectional highlighting
  var items = container.querySelectorAll('.my-note-item[data-ann-id]');
  items.forEach(function(item) {
    var annId = item.getAttribute('data-ann-id');
    item.addEventListener('mouseenter', function() { highlightOverlayItem(annId, true); });
    item.addEventListener('mouseleave', function() { highlightOverlayItem(annId, false); });
  });
}

function renderAnnotationOverlay() {
  var overlay = document.getElementById('annotationOverlay');
  if (!overlay) return;
  overlay.innerHTML = '';

  var allAnns = DATA.allAnnotations.concat(state.myAnnotations);
  var pageAnns = allAnns.filter(function(a) { return a.position.page === state.currentPage; });

  // Assign global index for numbering pins
  var pinCounter = 0;
  var allByPage = DATA.allAnnotations.concat(state.myAnnotations);
  var pinMap = {};
  allByPage.forEach(function(a) {
    if (a.type === 'pin') {
      pinCounter++;
      pinMap[a.id] = pinCounter;
    }
  });

  pageAnns.forEach(function(ann) {
    var el = document.createElement('div');
    el.setAttribute('data-ann-id', ann.id);

    if (ann.type === 'pin') {
      el.className = 'annotation-pin';
      el.style.left = ann.position.x + '%';
      el.style.top = ann.position.y + '%';
      el.style.background = ann.color;
      var num = pinMap[ann.id] || '';
      el.innerHTML = '<span class="pin-number">' + num + '</span>';
      el.title = ann.participantName + ': ' + ann.content;
    } else if (ann.type === 'highlight') {
      el.className = 'annotation-highlight';
      el.style.left = ann.position.x + '%';
      el.style.top = ann.position.y + '%';
      el.style.background = ann.color + '30';
      el.style.borderBottom = '3px solid ' + ann.color;
      el.style.setProperty('--ann-color', ann.color);
      el.title = ann.participantName + ': ' + ann.content;
      el.innerHTML = '<span class="highlight-label" style="background:' + ann.color + '">' + escapeHtml(ann.participantName.split(' ')[0]) + '</span>';
    } else {
      el.className = 'annotation-comment-marker';
      el.style.left = ann.position.x + '%';
      el.style.top = ann.position.y + '%';
      el.style.setProperty('--ann-color', ann.color);
      el.style.borderColor = ann.color;
      el.style.background = ann.color + '15';
      el.innerHTML = '<span class="marker-icon" style="background:' + ann.color + '">' + ann.participantName.charAt(0).toUpperCase() + '</span><span class="marker-text">' + escapeHtml(ann.content.length > 30 ? ann.content.substring(0, 30) + '...' : ann.content) + '</span>';
      el.title = ann.content;
    }

    // Click on overlay → scroll panel to annotation
    el.addEventListener('click', function(e) {
      e.stopPropagation();
      scrollPanelToAnnotation(ann.id);
    });

    // Hover on overlay → highlight panel item
    el.addEventListener('mouseenter', function() {
      highlightPanelItem(ann.id, true);
      el.classList.add('ann-active');
    });
    el.addEventListener('mouseleave', function() {
      highlightPanelItem(ann.id, false);
      el.classList.remove('ann-active');
    });

    overlay.appendChild(el);
  });

  // Also draw connector lines (CSS-based, using pseudo-elements on active items)
}

// ===== BIDIRECTIONAL LINKING =====
function goToAnnotation(page, annId) {
  state.currentPage = page;
  updatePageDisplay();
  scrollToPage();
  // Flash the annotation on the overlay
  setTimeout(function() {
    flashOverlayAnnotation(annId);
  }, 100);
}

function scrollPanelToAnnotation(annId) {
  // Try my notes first, then comments tab
  var myItem = document.querySelector('.my-note-item[data-ann-id="' + annId + '"]');
  if (myItem) {
    switchTab('notes', false);
    setTimeout(function() {
      myItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
      flashElement(myItem);
    }, 50);
    return;
  }
  var commentItem = document.querySelector('.comment-card[data-ann-id="' + annId + '"]');
  if (commentItem) {
    switchTab('comments', false);
    setTimeout(function() {
      commentItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
      flashElement(commentItem);
    }, 50);
  }
}

function scrollDocumentToAnnotation(annId, page) {
  if (page && page !== state.currentPage) {
    state.currentPage = page;
    updatePageDisplay();
    scrollToPage();
  }
  setTimeout(function() {
    flashOverlayAnnotation(annId);
  }, 100);
}

function flashOverlayAnnotation(annId) {
  var el = document.querySelector('.annotation-overlay [data-ann-id="' + annId + '"]');
  if (!el) return;
  el.classList.add('ann-flash');
  setTimeout(function() { el.classList.remove('ann-flash'); }, 1500);
}

function flashElement(el) {
  el.classList.add('panel-flash');
  setTimeout(function() { el.classList.remove('panel-flash'); }, 1500);
}

function highlightPanelItem(annId, active) {
  var items = document.querySelectorAll('[data-ann-id="' + annId + '"]');
  items.forEach(function(item) {
    if (item.closest('.side-panel') || item.closest('#myAnnotationsList')) {
      item.classList.toggle('panel-highlight', active);
    }
  });
}

function highlightOverlayItem(annId, active) {
  var el = document.querySelector('.annotation-overlay [data-ann-id="' + annId + '"]');
  if (el) {
    el.classList.toggle('ann-active', active);
  }
}

function replyToAnnotation(annId, name) {
  state.replyToId = annId;
  switchTab('notes', false);
  var textArea = document.getElementById('annotationText');
  if (textArea) {
    textArea.placeholder = 'R\\u00e9pondre \\u00e0 ' + name + '...';
    textArea.focus();
  }
}

// ===== SIGNATURE =====
function setupSignature() {
  var canvas = document.getElementById('signatureCanvas');
  if (!canvas) return;

  var rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = Math.max(200, rect.width - 12);
  canvas.height = 180;
  state.signatureCtx = canvas.getContext('2d');
  state.signatureCtx.strokeStyle = '#171717';
  state.signatureCtx.lineWidth = 2;
  state.signatureCtx.lineCap = 'round';
  state.signatureCtx.lineJoin = 'round';

  canvas.addEventListener('mousedown', function(e) { startDraw(e.offsetX, e.offsetY); });
  canvas.addEventListener('mousemove', function(e) { if (state.signatureDrawing) draw(e.offsetX, e.offsetY); });
  canvas.addEventListener('mouseup', stopDraw);
  canvas.addEventListener('mouseleave', stopDraw);
  canvas.addEventListener('touchstart', function(e) {
    e.preventDefault();
    var t = e.touches[0];
    var r = canvas.getBoundingClientRect();
    startDraw(t.clientX - r.left, t.clientY - r.top);
  });
  canvas.addEventListener('touchmove', function(e) {
    e.preventDefault();
    if (state.signatureDrawing) {
      var t = e.touches[0];
      var r = canvas.getBoundingClientRect();
      draw(t.clientX - r.left, t.clientY - r.top);
    }
  });
  canvas.addEventListener('touchend', stopDraw);
}

function startDraw(x, y) {
  state.signatureDrawing = true;
  state.signatureHasContent = true;
  state.signatureCtx.beginPath();
  state.signatureCtx.moveTo(x, y);
  updateSigStatus();
}
function draw(x, y) {
  state.signatureCtx.lineTo(x, y);
  state.signatureCtx.stroke();
}
function stopDraw() {
  state.signatureDrawing = false;
}

function clearSignature() {
  var canvas = document.getElementById('signatureCanvas');
  if (!canvas) return;
  state.signatureCtx.clearRect(0, 0, canvas.width, canvas.height);
  state.signatureHasContent = false;
  updateSigStatus();
}

function updateSigStatus() {
  var el = document.getElementById('sigStatus');
  if (el) {
    el.textContent = state.signatureHasContent ? 'Signature pr\\u00eate' : 'Aucune signature';
    el.style.color = state.signatureHasContent ? '#22c55e' : '#a3a3a3';
  }
  updateSigPlaceBtn();
}

// ===== SIGNATURE SOURCE SWITCHING =====
function switchSigSource(source) {
  state.sigSource = source;
  // Toggle tabs
  var tabs = document.querySelectorAll('.sig-tab');
  tabs.forEach(function(tab) {
    var label = tab.textContent.trim().toLowerCase();
    var tabSource = label === 'dessiner' ? 'draw' : label === 'importer' ? 'import' : 'saved';
    tab.classList.toggle('active', tabSource === source);
  });
  // Toggle panes
  var panes = document.querySelectorAll('.sig-source');
  panes.forEach(function(pane) { pane.classList.remove('active'); });
  var paneId = { draw: 'sigSourceDraw', import: 'sigSourceImport', saved: 'sigSourceSaved' }[source];
  var activePane = document.getElementById(paneId);
  if (activePane) activePane.classList.add('active');
  updateSigPlaceBtn();
}

// ===== SIGNATURE IMPORT =====
function handleSigFileImport(event) {
  var file = event.target.files[0];
  if (!file) return;
  // Validate type
  if (file.type !== 'image/png' && file.type !== 'image/jpeg') {
    alert('Format non support\\u00e9. Utilisez PNG ou JPG.');
    return;
  }
  // Validate size (2 Mo)
  if (file.size > 2 * 1024 * 1024) {
    alert('Fichier trop volumineux. Maximum 2 Mo.');
    return;
  }
  var reader = new FileReader();
  reader.onload = function(e) {
    state.sigImportedImage = e.target.result;
    var preview = document.getElementById('sigImportPreview');
    var importZone = document.getElementById('sigImportZone');
    var img = document.getElementById('sigImportImg');
    if (img) img.src = state.sigImportedImage;
    if (preview) preview.style.display = 'block';
    if (importZone) importZone.style.display = 'none';
    updateSigPlaceBtn();
  };
  reader.readAsDataURL(file);
}

function clearImportedSig() {
  state.sigImportedImage = null;
  var preview = document.getElementById('sigImportPreview');
  var importZone = document.getElementById('sigImportZone');
  var img = document.getElementById('sigImportImg');
  if (img) img.src = '';
  if (preview) preview.style.display = 'none';
  if (importZone) importZone.style.display = 'block';
  // Reset file input
  var fileInput = document.getElementById('sigFileInput');
  if (fileInput) fileInput.value = '';
  updateSigPlaceBtn();
}

// ===== SAVED SIGNATURE (localStorage) =====
function loadSavedSignature() {
  var container = document.getElementById('savedSigContent');
  if (!container) return;
  var saved = null;
  try { saved = localStorage.getItem('docjourney_saved_signature'); } catch(e) {}
  if (saved) {
    container.innerHTML = '<div class="sig-saved-preview"><img src="' + saved + '" /><div style="display:flex;gap:8px;justify-content:center"><button class="btn btn-primary btn-sm" onclick="useSavedSignature()">Utiliser</button><button class="btn btn-secondary btn-sm" onclick="deleteSavedSignature()">Supprimer</button></div></div>';
  } else {
    container.innerHTML = '<div class="sig-saved-empty">Aucune signature sauvegard\\u00e9e</div>';
  }
}

function useSavedSignature() {
  var saved = null;
  try { saved = localStorage.getItem('docjourney_saved_signature'); } catch(e) {}
  if (!saved) return;
  state.sigImportedImage = saved;
  updateSigPlaceBtn();
  // Visual feedback
  var container = document.getElementById('savedSigContent');
  if (container) {
    var info = container.querySelector('.sig-saved-preview');
    if (info) {
      var msg = document.createElement('div');
      msg.style.cssText = 'color:#16a34a;font-size:11px;font-weight:500;margin-top:6px;text-align:center';
      msg.textContent = '\\u2713 Signature charg\\u00e9e';
      info.appendChild(msg);
    }
  }
}

function saveSigToLocalStorage(imageDataURL) {
  try { localStorage.setItem('docjourney_saved_signature', imageDataURL); } catch(e) {}
}

function deleteSavedSignature() {
  try { localStorage.removeItem('docjourney_saved_signature'); } catch(e) {}
  loadSavedSignature();
}

// ===== INITIALS (PARAPHE) =====
function setupInitials() {
  var canvas = document.getElementById('initialsCanvas');
  if (!canvas) return;

  var rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = Math.max(150, rect.width - 12);
  canvas.height = 80;
  state.initialsCtx = canvas.getContext('2d');
  state.initialsCtx.strokeStyle = '#171717';
  state.initialsCtx.lineWidth = 2;
  state.initialsCtx.lineCap = 'round';
  state.initialsCtx.lineJoin = 'round';

  canvas.addEventListener('mousedown', function(e) { startInitialsDraw(e.offsetX, e.offsetY); });
  canvas.addEventListener('mousemove', function(e) { if (state.initialsDrawing) drawInitials(e.offsetX, e.offsetY); });
  canvas.addEventListener('mouseup', stopInitialsDraw);
  canvas.addEventListener('mouseleave', stopInitialsDraw);
  canvas.addEventListener('touchstart', function(e) {
    e.preventDefault();
    var t = e.touches[0];
    var r = canvas.getBoundingClientRect();
    startInitialsDraw(t.clientX - r.left, t.clientY - r.top);
  });
  canvas.addEventListener('touchmove', function(e) {
    e.preventDefault();
    if (state.initialsDrawing) {
      var t = e.touches[0];
      var r = canvas.getBoundingClientRect();
      drawInitials(t.clientX - r.left, t.clientY - r.top);
    }
  });
  canvas.addEventListener('touchend', stopInitialsDraw);
}

function startInitialsDraw(x, y) {
  state.initialsDrawing = true;
  state.initialsHasContent = true;
  state.initialsCtx.beginPath();
  state.initialsCtx.moveTo(x, y);
  updateInitialsStatus();
}

function drawInitials(x, y) {
  state.initialsCtx.lineTo(x, y);
  state.initialsCtx.stroke();
}

function stopInitialsDraw() {
  state.initialsDrawing = false;
}

function clearInitials() {
  var canvas = document.getElementById('initialsCanvas');
  if (!canvas) return;
  state.initialsCtx.clearRect(0, 0, canvas.width, canvas.height);
  state.initialsHasContent = false;
  updateInitialsStatus();
}

function updateInitialsStatus() {
  var el = document.getElementById('initialsStatus');
  if (el) {
    el.textContent = state.initialsHasContent ? 'Paraphe pr\\u00eat' : 'Aucun paraphe';
    el.style.color = state.initialsHasContent ? '#22c55e' : '#a3a3a3';
  }
}

function switchInitialsSource(source) {
  state.initialsSource = source;
  var tabs = document.querySelectorAll('.initials-tabs .sig-tab');
  tabs.forEach(function(tab) {
    var label = tab.textContent.trim().toLowerCase();
    var tabSource = label === 'dessiner' ? 'draw' : label === 'importer' ? 'import' : 'saved';
    tab.classList.toggle('active', tabSource === source);
  });
  var panes = document.querySelectorAll('.initials-source');
  panes.forEach(function(pane) { pane.classList.remove('active'); });
  var paneId = { draw: 'initialsSourceDraw', import: 'initialsSourceImport', saved: 'initialsSourceSaved' }[source];
  var activePane = document.getElementById(paneId);
  if (activePane) activePane.classList.add('active');
}

function handleInitialsFileImport(event) {
  var file = event.target.files[0];
  if (!file) return;
  if (file.type !== 'image/png' && file.type !== 'image/jpeg') {
    alert('Format non support\\u00e9. Utilisez PNG ou JPG.');
    return;
  }
  if (file.size > 2 * 1024 * 1024) {
    alert('Fichier trop volumineux. Maximum 2 Mo.');
    return;
  }
  var reader = new FileReader();
  reader.onload = function(e) {
    state.initialsImportedImage = e.target.result;
    var preview = document.getElementById('initialsImportPreview');
    var importZone = document.getElementById('initialsImportZone');
    var img = document.getElementById('initialsImportImg');
    if (img) img.src = state.initialsImportedImage;
    if (preview) preview.style.display = 'block';
    if (importZone) importZone.style.display = 'none';
  };
  reader.readAsDataURL(file);
}

function clearImportedInitials() {
  state.initialsImportedImage = null;
  var preview = document.getElementById('initialsImportPreview');
  var importZone = document.getElementById('initialsImportZone');
  var img = document.getElementById('initialsImportImg');
  if (img) img.src = '';
  if (preview) preview.style.display = 'none';
  if (importZone) importZone.style.display = 'block';
  var fileInput = document.getElementById('initialsFileInput');
  if (fileInput) fileInput.value = '';
}

function loadSavedInitials() {
  var container = document.getElementById('savedInitialsContent');
  if (!container) return;
  var saved = null;
  try { saved = localStorage.getItem('docjourney_saved_initials'); } catch(e) {}
  if (saved) {
    container.innerHTML = '<div class="sig-saved-preview"><img src="' + saved + '" style="max-height:60px" /><div style="display:flex;gap:8px;justify-content:center"><button class="btn btn-primary btn-sm" onclick="useSavedInitials()">Utiliser</button><button class="btn btn-secondary btn-sm" onclick="deleteSavedInitials()">Supprimer</button></div></div>';
  } else {
    container.innerHTML = '<div class="sig-saved-empty">Aucun paraphe sauvegard\\u00e9</div>';
  }
}

function useSavedInitials() {
  var saved = null;
  try { saved = localStorage.getItem('docjourney_saved_initials'); } catch(e) {}
  if (!saved) return;
  state.initialsImportedImage = saved;
  var container = document.getElementById('savedInitialsContent');
  if (container) {
    var info = container.querySelector('.sig-saved-preview');
    if (info) {
      var msg = document.createElement('div');
      msg.style.cssText = 'color:#16a34a;font-size:11px;font-weight:500;margin-top:6px;text-align:center';
      msg.textContent = '\\u2713 Paraphe charg\\u00e9';
      info.appendChild(msg);
    }
  }
}

function saveInitialsToLocalStorage(imageDataURL) {
  try { localStorage.setItem('docjourney_saved_initials', imageDataURL); } catch(e) {}
}

function deleteSavedInitials() {
  try { localStorage.removeItem('docjourney_saved_initials'); } catch(e) {}
  loadSavedInitials();
}

function getInitialsImage() {
  if (state.initialsSource === 'draw') {
    var canvas = document.getElementById('initialsCanvas');
    if (canvas && state.initialsHasContent) {
      return canvas.toDataURL('image/png');
    }
    return null;
  }
  if (state.initialsSource === 'import') {
    return state.initialsImportedImage || null;
  }
  if (state.initialsSource === 'saved') {
    if (state.initialsImportedImage) return state.initialsImportedImage;
    try { return localStorage.getItem('docjourney_saved_initials'); } catch(e) { return null; }
  }
  return null;
}

function hasAnyInitials() {
  if (state.initialsSource === 'draw') return state.initialsHasContent;
  if (state.initialsSource === 'import') return !!state.initialsImportedImage;
  if (state.initialsSource === 'saved') {
    if (state.initialsImportedImage) return true;
    try { return !!localStorage.getItem('docjourney_saved_initials'); } catch(e) { return false; }
  }
  return false;
}

// ===== SIGNATURE PLACEMENT — DRAG & RESIZE =====

function setupSigDragResize() {
  var draggable = document.getElementById('sigDraggable');
  var resizeHandle = document.getElementById('sigResizeHandle');
  if (!draggable) return;

  // --- Helpers ---
  function getOverlayBounds() {
    var overlay = document.getElementById('sigPlacementOverlay');
    if (!overlay) return { left: 0, top: 0, width: 800, height: 600 };
    return overlay.getBoundingClientRect();
  }

  function getMinY() {
    var tb = document.querySelector('.viewer-toolbar');
    return tb ? tb.offsetHeight : 0;
  }

  function clampPosition() {
    var ob = getOverlayBounds();
    var minY = getMinY();
    var x = parseFloat(draggable.style.left) || 0;
    var y = parseFloat(draggable.style.top) || 0;
    x = Math.max(0, Math.min(x, ob.width - draggable.offsetWidth));
    y = Math.max(minY, Math.min(y, ob.height - draggable.offsetHeight));
    draggable.style.left = x + 'px';
    draggable.style.top = y + 'px';
  }

  function savePosition() {
    var overlay = document.getElementById('sigPlacementOverlay');
    if (!overlay) return;
    var x = parseFloat(draggable.style.left) || 0;
    var y = parseFloat(draggable.style.top) || 0;
    state.sigPosition = {
      x: Math.round(x / (overlay.clientWidth || 1) * 10000) / 100,
      y: Math.round(y / (overlay.clientHeight || 1) * 10000) / 100
    };
  }

  // --- DRAG ---
  function onMouseDown(e) {
    // Ignore if clicking the resize handle
    if (resizeHandle && resizeHandle.contains(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
    state.sigDragging = true;
    var rect = draggable.getBoundingClientRect();
    state.sigDragOffset = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    draggable.style.transition = 'none';
  }

  function onMouseMove(e) {
    if (state.sigDragging) {
      e.preventDefault();
      var ob = getOverlayBounds();
      var minY = getMinY();
      var x = e.clientX - ob.left - state.sigDragOffset.x;
      var y = e.clientY - ob.top - state.sigDragOffset.y;
      x = Math.max(0, Math.min(x, ob.width - draggable.offsetWidth));
      y = Math.max(minY, Math.min(y, ob.height - draggable.offsetHeight));
      draggable.style.left = x + 'px';
      draggable.style.top = y + 'px';
    }
    if (state.sigResizing) {
      e.preventDefault();
      var dx = e.clientX - state.sigResizeOrigin.x;
      var dy = e.clientY - state.sigResizeOrigin.y;
      // Keep aspect ratio: use the larger delta
      var delta = Math.abs(dx) > Math.abs(dy) ? dx : dy;
      var newW = Math.max(60, Math.min(500, state.sigResizeOrigin.w + delta));
      var ratio = newW / state.sigResizeOrigin.w;
      var newH = Math.max(30, state.sigResizeOrigin.h * ratio);
      var img = document.getElementById('sigDraggableImg');
      if (img) {
        img.style.maxWidth = newW + 'px';
        img.style.maxHeight = newH + 'px';
      }
      state.sigScale = newW / 200; // 200 = default max-width
    }
  }

  function onMouseUp() {
    if (state.sigDragging) {
      state.sigDragging = false;
      draggable.style.transition = 'box-shadow .15s';
      clampPosition();
      savePosition();
      updateSigPositionDisplay();
    }
    if (state.sigResizing) {
      state.sigResizing = false;
      clampPosition();
      savePosition();
    }
  }

  // --- RESIZE ---
  function onResizeDown(e) {
    e.preventDefault();
    e.stopPropagation();
    state.sigResizing = true;
    var img = document.getElementById('sigDraggableImg');
    state.sigResizeOrigin = {
      x: e.clientX,
      y: e.clientY,
      w: img ? img.offsetWidth : 200,
      h: img ? img.offsetHeight : 80
    };
  }

  // --- Register mouse events ---
  draggable.addEventListener('mousedown', onMouseDown);
  if (resizeHandle) resizeHandle.addEventListener('mousedown', onResizeDown);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);

  // Block clicks from propagating to viewport
  draggable.addEventListener('click', function(e) { e.stopPropagation(); });

  // --- Touch events ---
  draggable.addEventListener('touchstart', function(e) {
    if (resizeHandle && resizeHandle.contains(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
    var t = e.touches[0];
    state.sigDragging = true;
    var rect = draggable.getBoundingClientRect();
    state.sigDragOffset = { x: t.clientX - rect.left, y: t.clientY - rect.top };
    draggable.style.transition = 'none';
  });

  if (resizeHandle) {
    resizeHandle.addEventListener('touchstart', function(e) {
      e.preventDefault();
      e.stopPropagation();
      var t = e.touches[0];
      state.sigResizing = true;
      var img = document.getElementById('sigDraggableImg');
      state.sigResizeOrigin = {
        x: t.clientX,
        y: t.clientY,
        w: img ? img.offsetWidth : 200,
        h: img ? img.offsetHeight : 80
      };
    });
  }

  document.addEventListener('touchmove', function(e) {
    if (state.sigDragging) {
      var t = e.touches[0];
      var ob = getOverlayBounds();
      var minY = getMinY();
      var x = t.clientX - ob.left - state.sigDragOffset.x;
      var y = t.clientY - ob.top - state.sigDragOffset.y;
      x = Math.max(0, Math.min(x, ob.width - draggable.offsetWidth));
      y = Math.max(minY, Math.min(y, ob.height - draggable.offsetHeight));
      draggable.style.left = x + 'px';
      draggable.style.top = y + 'px';
    }
    if (state.sigResizing) {
      var t = e.touches[0];
      var dx = t.clientX - state.sigResizeOrigin.x;
      var dy = t.clientY - state.sigResizeOrigin.y;
      var delta = Math.abs(dx) > Math.abs(dy) ? dx : dy;
      var newW = Math.max(60, Math.min(500, state.sigResizeOrigin.w + delta));
      var ratio = newW / state.sigResizeOrigin.w;
      var newH = Math.max(30, state.sigResizeOrigin.h * ratio);
      var img = document.getElementById('sigDraggableImg');
      if (img) {
        img.style.maxWidth = newW + 'px';
        img.style.maxHeight = newH + 'px';
      }
      state.sigScale = newW / 200;
    }
  });

  document.addEventListener('touchend', function() { onMouseUp(); });
}

function startSigPlacement() {
  var sigImage = getSigImage();
  if (!sigImage) return;
  var overlay = document.getElementById('sigPlacementOverlay');
  var draggable = document.getElementById('sigDraggable');
  var img = document.getElementById('sigDraggableImg');
  if (!overlay || !draggable || !img) return;

  img.src = sigImage;
  // Apply stored scale
  img.style.maxWidth = (200 * state.sigScale) + 'px';
  img.style.maxHeight = (80 * state.sigScale) + 'px';

  overlay.style.display = 'block';

  // Place at stored position (below toolbar)
  var ow = overlay.clientWidth || 400;
  var oh = overlay.clientHeight || 400;
  var tb = document.querySelector('.viewer-toolbar');
  var tbH = tb ? tb.offsetHeight : 0;
  draggable.style.left = Math.max(0, (state.sigPosition.x / 100 * ow) - (100 * state.sigScale)) + 'px';
  draggable.style.top = Math.max(tbH, (state.sigPosition.y / 100 * oh) - (40 * state.sigScale)) + 'px';

  state.sigPlaced = true;
  updateSigPositionDisplay();
}

function removeSigPlacement() {
  var overlay = document.getElementById('sigPlacementOverlay');
  if (overlay) overlay.style.display = 'none';
  state.sigPlaced = false;
  updateSigPositionDisplay();
}

function updateSigPositionDisplay() {
  var placeBtn = document.getElementById('sigPlaceBtn');
  var posInfo = document.getElementById('sigPositionInfo');
  if (placeBtn) placeBtn.style.display = state.sigPlaced ? 'none' : (hasAnySignature() ? 'flex' : 'none');
  if (posInfo) posInfo.style.display = state.sigPlaced ? 'flex' : 'none';
}

function getSigImage() {
  if (state.sigSource === 'draw') {
    var canvas = document.getElementById('signatureCanvas');
    if (canvas && state.signatureHasContent) {
      return applyWatermark(canvas);
    }
    return null;
  }
  if (state.sigSource === 'import') {
    return state.sigImportedImage || null;
  }
  if (state.sigSource === 'saved') {
    if (state.sigImportedImage) return state.sigImportedImage;
    try { return localStorage.getItem('docjourney_saved_signature'); } catch(e) { return null; }
  }
  return null;
}

function hasAnySignature() {
  if (state.sigSource === 'draw') return state.signatureHasContent;
  if (state.sigSource === 'import') return !!state.sigImportedImage;
  if (state.sigSource === 'saved') {
    if (state.sigImportedImage) return true;
    try { return !!localStorage.getItem('docjourney_saved_signature'); } catch(e) { return false; }
  }
  return false;
}

function updateSigPlaceBtn() {
  var placeBtn = document.getElementById('sigPlaceBtn');
  if (!placeBtn) return;
  var hasSig = hasAnySignature();
  placeBtn.style.display = (hasSig && !state.sigPlaced) ? 'flex' : 'none';
}

// ===== SIGNATURE SECURITY =====
function setupSigSecurity() {
  // Disable right-click on signature elements
  document.addEventListener('contextmenu', function(e) {
    if (e.target.closest('.signature-zone, .sig-draggable, .sig-placement-overlay')) {
      e.preventDefault();
    }
  });
  // Disable native drag on signature images
  document.addEventListener('dragstart', function(e) {
    if (e.target.closest('.signature-zone, .sig-draggable, .sig-placement-overlay')) {
      e.preventDefault();
    }
  });
  // Block Ctrl+C / Ctrl+S on signature zone
  document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 's')) {
      if (document.activeElement && document.activeElement.closest('.signature-zone, .sig-placement-overlay')) {
        e.preventDefault();
      }
    }
  });
}

function applyWatermark(srcCanvas) {
  // Create a copy canvas with watermark
  var wCanvas = document.createElement('canvas');
  wCanvas.width = srcCanvas.width;
  wCanvas.height = srcCanvas.height;
  var ctx = wCanvas.getContext('2d');
  // Draw original signature
  ctx.drawImage(srcCanvas, 0, 0);
  // Apply watermark in very low opacity
  ctx.save();
  ctx.globalAlpha = 0.03;
  ctx.font = '10px sans-serif';
  ctx.fillStyle = '#000000';
  var text = DATA.currentStep.participant.name + ' | ' + DATA.currentStep.participant.email + ' | ' + DATA.security.documentHash.substring(0, 16);
  ctx.rotate(-0.3);
  for (var wy = -wCanvas.height; wy < wCanvas.height * 2; wy += 30) {
    for (var wx = -wCanvas.width; wx < wCanvas.width * 2; wx += 250) {
      ctx.fillText(text, wx, wy);
    }
  }
  ctx.restore();
  return wCanvas.toDataURL('image/png');
}

// ===== DECISION FLOW =====
function showApprovalConfirmation() {
  var commentCount = state.myAnnotations.length;
  var generalComment = (document.getElementById('generalComment') || {}).value || '';
  var text = '<strong>D\\u00e9cision :</strong> Approbation';
  if (commentCount > 0) text += '<br>' + commentCount + ' annotation(s) ajout\\u00e9e(s)';
  if (generalComment.trim()) text += '<br><em>"' + escapeHtml(generalComment.trim().substring(0, 100)) + (generalComment.length > 100 ? '...' : '') + '"</em>';

  var summaryEl = document.getElementById('approvalSummaryText');
  if (summaryEl) summaryEl.innerHTML = text;

  // Check signer requirements
  if (DATA.currentStep.role === 'signer') {
    if (!hasAnySignature()) {
      alert('Veuillez apposer votre signature avant de valider.');
      return;
    }
    var certCheck = document.getElementById('certifyCheck');
    if (certCheck && !certCheck.checked) {
      alert('Veuillez cocher la case de certification.');
      return;
    }
  }

  showModal('approvalModal');
}

function showModificationConfirmation() {
  showModal('modificationModal');
}

function showRejectionConfirmation() {
  showModal('rejectionModal');
}

function confirmDecision(type) {
  if (state.decisionMade) return;

  var decision;
  var rejectionDetails = null;

  if (type === 'reject') {
    var cat = document.getElementById('rejCategory').value;
    var reason = document.getElementById('rejReason').value.trim();
    if (!cat) { alert('Veuillez s\\u00e9lectionner une cat\\u00e9gorie.'); return; }
    if (!reason) { alert('Veuillez saisir une raison.'); return; }
    decision = 'rejected';
    rejectionDetails = { category: cat, reason: reason };
    hideModal('rejectionModal');
  } else if (type === 'modification_requested') {
    var modCat = document.getElementById('modCategory').value;
    var modReason = document.getElementById('modReason').value.trim();
    if (!modReason) { alert('Veuillez saisir la raison de la modification.'); return; }
    decision = 'modification_requested';
    rejectionDetails = { category: modCat || 'other', reason: modReason };
    hideModal('modificationModal');
  } else {
    var role = DATA.currentStep.role;
    decision = {reviewer:'reviewed',validator:'validated',approver:'approved',signer:'approved'}[role] || 'approved';
    hideModal('approvalModal');
  }

  state.decisionMade = true;

  var generalComment = (document.getElementById('generalComment') || {}).value || '';
  generalComment = generalComment.trim();

  var sigData = null;
  if (hasAnySignature()) {
    var sigImage = getSigImage();
    if (sigImage) {
      sigData = {
        image: sigImage,
        timestamp: new Date(),
        hash: DATA.security.documentHash,
        metadata: {
          participantName: DATA.currentStep.participant.name,
          participantEmail: DATA.currentStep.participant.email,
          userAgent: navigator.userAgent
        },
        position: state.sigPlaced ? state.sigPosition : undefined,
        source: state.sigSource
      };
    }
    // Save signature to localStorage if checkbox checked
    var sigSaveCheck = document.getElementById('sigSaveCheck');
    if (sigSaveCheck && sigSaveCheck.checked && sigImage) {
      saveSigToLocalStorage(sigImage);
    }
  }

  // Initials (Paraphe) data
  var initialsData = null;
  if (hasAnyInitials()) {
    var initialsImage = getInitialsImage();
    if (initialsImage) {
      initialsData = {
        image: initialsImage,
        timestamp: new Date(),
        hash: DATA.security.documentHash,
        metadata: {
          participantName: DATA.currentStep.participant.name,
          participantEmail: DATA.currentStep.participant.email,
          userAgent: navigator.userAgent
        },
        applyToAllPages: true,
        source: state.initialsSource
      };
    }
    // Save initials to localStorage if checkbox checked
    var initialsSaveCheck = document.getElementById('initialsSaveCheck');
    if (initialsSaveCheck && initialsSaveCheck.checked && initialsImage) {
      saveInitialsToLocalStorage(initialsImage);
    }
  }

  state.returnData = {
    version: '2.0.0',
    packageId: DATA.packageId,
    workflowId: DATA.workflow.id,
    stepId: DATA.currentStep.id,
    documentId: DATA.document.id,
    participant: DATA.currentStep.participant,
    decision: decision,
    rejectionDetails: rejectionDetails || undefined,
    generalComment: generalComment || undefined,
    annotations: state.myAnnotations,
    signature: sigData,
    initials: initialsData,
    completedAt: new Date(),
    documentHash: DATA.security.documentHash
  };

  // Disable decision buttons
  var btns = document.getElementById('decisionButtons');
  if (btns) {
    var buttons = btns.querySelectorAll('button');
    buttons.forEach(function(b) { b.disabled = true; });
  }

  showDownloadScreen(decision, generalComment, rejectionDetails);
}

function showDownloadScreen(decision, comment, rejDetails) {
  var screen = document.getElementById('downloadScreen');
  var iconWrap = document.getElementById('downloadIcon');
  var decisionLabel = document.getElementById('downloadDecisionLabel');
  var summaryRows = document.getElementById('downloadSummaryRows');

  var label = getDecisionLabel(decision);

  // Single monochrome checkmark icon for all decisions
  iconWrap.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';

  decisionLabel.textContent = label;

  // Build summary
  var now = new Date();
  var dateStr = String(now.getDate()).padStart(2, '0') + '/' + String(now.getMonth() + 1).padStart(2, '0') + '/' + now.getFullYear() + ' \\u00e0 ' + String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');

  var rows = '';
  rows += '<div class="row"><span class="label">Document</span><span class="value">' + escapeHtml(DATA.document.name) + '</span></div>';
  rows += '<div class="row"><span class="label">Participant</span><span class="value">' + escapeHtml(DATA.currentStep.participant.name) + '</span></div>';
  rows += '<div class="row"><span class="label">R\\u00f4le</span><span class="value">' + getRoleLabel(DATA.currentStep.role) + '</span></div>';
  rows += '<div class="row"><span class="label">D\\u00e9cision</span><span class="value">' + label + '</span></div>';
  if (state.myAnnotations.length > 0) {
    rows += '<div class="row"><span class="label">Annotations</span><span class="value">' + state.myAnnotations.length + '</span></div>';
  }
  if (hasAnyInitials()) {
    rows += '<div class="row"><span class="label">Paraphe</span><span class="value">Inclus (toutes pages)</span></div>';
  }
  if (hasAnySignature()) {
    rows += '<div class="row"><span class="label">Signature</span><span class="value">Incluse</span></div>';
  }
  if (comment) {
    rows += '<div class="row"><span class="label">Commentaire</span><span class="value">' + escapeHtml(comment.substring(0, 60)) + (comment.length > 60 ? '...' : '') + '</span></div>';
  }
  if (rejDetails) {
    rows += '<div class="row"><span class="label">Raison</span><span class="value">' + escapeHtml(rejDetails.reason.substring(0, 60)) + (rejDetails.reason.length > 60 ? '...' : '') + '</span></div>';
  }
  rows += '<div class="row"><span class="label">Date</span><span class="value">' + dateStr + '</span></div>';
  summaryRows.innerHTML = rows;

  screen.classList.add('visible');
}

// ===== DOWNLOAD =====
function downloadReturn() {
  if (!state.returnData) return;
  var blob = new Blob([JSON.stringify(state.returnData, null, 2)], {type: 'application/json'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = DATA.document.name.replace(/\\.[^.]+$/, '') + '.docjourney';
  a.click();
  URL.revokeObjectURL(url);
}

// ===== PDF RECEIPT GENERATION =====
function downloadReceipt() {
  if (!state.returnData) return;
  generateReceiptPDF().then(function(pdf) {
    var docRef = 'DJ-' + DATA.document.id.substring(0, 8).toUpperCase();
    pdf.save('Recu_' + docRef + '.pdf');
  }).catch(function(err) {
    console.error('PDF generation error:', err);
    alert('Erreur lors de la g\\u00e9n\\u00e9ration du re\\u00e7u PDF.');
  });
}

async function generateReceiptPDF() {
  // Create jsPDF instance (A4 format)
  var pdf = new jspdf.jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  var pageWidth = 210;
  var pageHeight = 297;
  var margin = 20;
  var contentWidth = pageWidth - 2 * margin;
  var y = margin;

  var docRef = 'DJ-' + DATA.document.id.substring(0, 8).toUpperCase();
  var rd = state.returnData;

  // ===== HEADER =====
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(24);
  pdf.setTextColor(23, 23, 23);
  pdf.text('DocJourney', margin, y + 8);

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(115, 115, 115);
  pdf.text('Re\\u00e7u de participation', pageWidth - margin, y + 4, { align: 'right' });
  pdf.text(formatDateForPDF(new Date()), pageWidth - margin, y + 9, { align: 'right' });

  y += 20;

  // Title
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.setTextColor(23, 23, 23);
  pdf.text('RE\\u00c7U DE VALIDATION', margin, y);
  y += 8;

  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(82, 82, 82);
  pdf.text('R\\u00e9f\\u00e9rence: ' + docRef, margin, y);
  y += 12;

  // Separator line
  pdf.setDrawColor(229, 229, 229);
  pdf.setLineWidth(0.5);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 10;

  // ===== PARTICIPANT SECTION =====
  y = drawSection(pdf, 'Participant', [
    { label: 'Nom', value: rd.participant.name },
    { label: 'Email', value: rd.participant.email },
    { label: 'R\\u00f4le', value: getRoleLabel(DATA.currentStep.role) }
  ], margin, y, contentWidth);

  y += 8;

  // ===== DOCUMENT SECTION =====
  y = drawSection(pdf, 'Document', [
    { label: 'Nom', value: DATA.document.name },
    { label: '\\u00c9tape', value: DATA.currentStep.order + ' / ' + DATA.workflow.totalSteps }
  ], margin, y, contentWidth);

  y += 8;

  // ===== DECISION SECTION =====
  var decisionColor = getDecisionColor(rd.decision);
  var decisionLabel = getDecisionLabel(rd.decision);
  var decisionDate = formatDateForPDF(new Date(rd.completedAt));

  pdf.setFillColor(250, 250, 250);
  pdf.roundedRect(margin, y, contentWidth, 22, 2, 2, 'F');
  pdf.setDrawColor(229, 229, 229);
  pdf.roundedRect(margin, y, contentWidth, 22, 2, 2, 'S');

  // Decision indicator dot
  pdf.setFillColor(decisionColor.r, decisionColor.g, decisionColor.b);
  pdf.circle(margin + 8, y + 11, 3, 'F');

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(82, 82, 82);
  pdf.text('D\\u00e9cision', margin + 16, y + 8);
  pdf.text(decisionDate, pageWidth - margin - 5, y + 8, { align: 'right' });

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.setTextColor(decisionColor.r, decisionColor.g, decisionColor.b);
  pdf.text(decisionLabel.toUpperCase(), margin + 16, y + 16);

  y += 30;

  // ===== ANNOTATIONS SECTION =====
  if (rd.annotations && rd.annotations.length > 0) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(23, 23, 23);
    pdf.text('Annotations (' + rd.annotations.length + ')', margin, y);
    y += 6;

    rd.annotations.forEach(function(ann, idx) {
      if (y > pageHeight - 60) {
        pdf.addPage();
        y = margin;
      }

      var typeLabels = { comment: 'Commentaire', highlight: 'Surlignage', pin: '\\u00c9pingle' };
      var typeLabel = typeLabels[ann.type] || ann.type;
      var annText = 'p.' + ann.position.page + ' - ' + typeLabel + ': ' + ann.content;

      pdf.setFillColor(250, 250, 250);
      var textLines = pdf.splitTextToSize(annText, contentWidth - 10);
      var boxHeight = Math.max(12, textLines.length * 5 + 6);
      pdf.roundedRect(margin, y, contentWidth, boxHeight, 2, 2, 'F');

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(64, 64, 64);
      pdf.text(textLines, margin + 5, y + 6);

      y += boxHeight + 3;
    });
    y += 5;
  }

  // ===== GENERAL COMMENT =====
  if (rd.generalComment) {
    if (y > pageHeight - 50) {
      pdf.addPage();
      y = margin;
    }

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(23, 23, 23);
    pdf.text('Commentaire g\\u00e9n\\u00e9ral', margin, y);
    y += 6;

    pdf.setFillColor(250, 250, 250);
    var commentLines = pdf.splitTextToSize(rd.generalComment, contentWidth - 10);
    var commentBoxHeight = Math.max(14, commentLines.length * 5 + 8);
    pdf.roundedRect(margin, y, contentWidth, commentBoxHeight, 2, 2, 'F');

    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(10);
    pdf.setTextColor(82, 82, 82);
    pdf.text(commentLines, margin + 5, y + 7);

    y += commentBoxHeight + 8;
  }

  // ===== INITIALS (PARAPHE) =====
  if (rd.initials && rd.initials.image) {
    if (y > pageHeight - 50) {
      pdf.addPage();
      y = margin;
    }

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(23, 23, 23);
    pdf.text('Paraphe', margin, y);
    y += 6;

    try {
      pdf.addImage(rd.initials.image, 'PNG', margin, y, 25, 15);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(115, 115, 115);
      pdf.text('Appliqu\\u00e9 sur toutes les pages', margin + 30, y + 8);
      y += 22;
    } catch(e) {
      console.warn('Could not add initials image:', e);
    }
  }

  // ===== SIGNATURE =====
  if (rd.signature && rd.signature.image) {
    if (y > pageHeight - 60) {
      pdf.addPage();
      y = margin;
    }

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(23, 23, 23);
    pdf.text('Signature', margin, y);
    y += 6;

    try {
      pdf.addImage(rd.signature.image, 'PNG', margin, y, 50, 25);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(23, 23, 23);
      pdf.text(rd.participant.name, margin + 55, y + 8);

      pdf.setFontSize(9);
      pdf.setTextColor(115, 115, 115);
      var sigDate = formatDateForPDF(new Date(rd.signature.timestamp));
      pdf.text(sigDate, margin + 55, y + 14);

      if (rd.signature.position) {
        pdf.text('Position: ' + rd.signature.position.x.toFixed(0) + '%, ' + rd.signature.position.y.toFixed(0) + '%', margin + 55, y + 20);
      }

      y += 32;
    } catch(e) {
      console.warn('Could not add signature image:', e);
    }
  }

  // ===== VERIFICATION SECTION =====
  if (y > pageHeight - 70) {
    pdf.addPage();
    y = margin;
  }

  y += 5;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(23, 23, 23);
  pdf.text('V\\u00e9rification', margin, y);
  y += 6;

  // Verification box with QR code
  pdf.setFillColor(250, 250, 250);
  pdf.roundedRect(margin, y, contentWidth, 40, 2, 2, 'F');
  pdf.setDrawColor(229, 229, 229);
  pdf.roundedRect(margin, y, contentWidth, 40, 2, 2, 'S');

  // Generate QR code
  var qrContent = 'DocJourney Receipt|' + docRef + '|' + rd.participant.email + '|' + rd.decision + '|' + DATA.security.documentHash.substring(0, 16);
  try {
    var qrDataUrl = await generateQRCode(qrContent);
    pdf.addImage(qrDataUrl, 'PNG', margin + 5, y + 5, 30, 30);
  } catch(e) {
    console.warn('QR code generation failed:', e);
    // Draw placeholder
    pdf.setFillColor(229, 229, 229);
    pdf.rect(margin + 5, y + 5, 30, 30, 'F');
    pdf.setFontSize(8);
    pdf.setTextColor(115, 115, 115);
    pdf.text('QR', margin + 17, y + 22);
  }

  // Verification info
  var infoX = margin + 42;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(82, 82, 82);
  pdf.text('Empreinte document', infoX, y + 10);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(64, 64, 64);
  pdf.text(DATA.security.documentHash.substring(0, 32) + '...', infoX, y + 16);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(82, 82, 82);
  pdf.text('Cha\\u00eene de validation', infoX, y + 26);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(64, 64, 64);
  var chainHash = DATA.security.chainHash || DATA.security.documentHash;
  pdf.text(chainHash.substring(0, 32) + '...', infoX, y + 32);

  // Verified badge
  pdf.setFillColor(220, 252, 231);
  pdf.roundedRect(pageWidth - margin - 25, y + 12, 20, 16, 2, 2, 'F');
  pdf.setFontSize(16);
  pdf.setTextColor(22, 163, 74);
  pdf.text('\\u2713', pageWidth - margin - 18, y + 24);

  y += 50;

  // ===== FOOTER =====
  var footerY = pageHeight - 20;
  pdf.setDrawColor(229, 229, 229);
  pdf.line(margin, footerY - 10, pageWidth - margin, footerY - 10);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(163, 163, 163);
  var footerText = 'G\\u00e9n\\u00e9r\\u00e9 par DocJourney le ' + formatDateForPDF(new Date());
  pdf.text(footerText, pageWidth / 2, footerY - 3, { align: 'center' });

  pdf.setFontSize(8);
  pdf.text('Ce document atteste de la participation au circuit de validation du document r\\u00e9f\\u00e9renc\\u00e9.', pageWidth / 2, footerY + 3, { align: 'center' });

  return pdf;
}

function drawSection(pdf, title, items, x, y, width) {
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(82, 82, 82);
  pdf.text(title, x, y);
  y += 4;

  pdf.setFillColor(250, 250, 250);
  var boxHeight = items.length * 7 + 6;
  pdf.roundedRect(x, y, width, boxHeight, 2, 2, 'F');
  pdf.setDrawColor(229, 229, 229);
  pdf.roundedRect(x, y, width, boxHeight, 2, 2, 'S');

  y += 6;
  items.forEach(function(item) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(23, 23, 23);
    var displayValue = item.value;
    if (displayValue && displayValue.length > 50) {
      displayValue = displayValue.substring(0, 47) + '...';
    }
    pdf.text(displayValue, x + 5, y);
    y += 7;
  });

  return y + 2;
}

function getDecisionColor(decision) {
  var colors = {
    approved: { r: 34, g: 197, b: 94 },
    validated: { r: 34, g: 197, b: 94 },
    reviewed: { r: 59, g: 130, b: 246 },
    rejected: { r: 239, g: 68, b: 68 },
    modification_requested: { r: 245, g: 158, b: 11 }
  };
  return colors[decision] || { r: 115, g: 115, b: 115 };
}

function formatDateForPDF(date) {
  var d = new Date(date);
  var dd = String(d.getDate()).padStart(2, '0');
  var mm = String(d.getMonth() + 1).padStart(2, '0');
  var yyyy = d.getFullYear();
  var hh = String(d.getHours()).padStart(2, '0');
  var min = String(d.getMinutes()).padStart(2, '0');
  return dd + '/' + mm + '/' + yyyy + ' \\u00e0 ' + hh + ':' + min;
}

function generateQRCode(text) {
  return new Promise(function(resolve, reject) {
    try {
      var canvas = document.createElement('canvas');
      QRCode.toCanvas(canvas, text, {
        width: 128,
        margin: 1,
        color: { dark: '#171717', light: '#ffffff' }
      }, function(error) {
        if (error) {
          reject(error);
        } else {
          resolve(canvas.toDataURL('image/png'));
        }
      });
    } catch(e) {
      reject(e);
    }
  });
}

function copyEmail() {
  var email = DATA.owner.email;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(email).then(function() {
      var btn = document.querySelector('.copy-email-btn');
      if (btn) { btn.textContent = 'Copi\\u00e9 !'; setTimeout(function() { btn.textContent = 'Copier l\\'adresse email'; }, 2000); }
    });
  } else {
    var input = document.createElement('input');
    input.value = email;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
  }
}

// ===== MODALS =====
function showModal(id) {
  document.getElementById(id).classList.add('visible');
}

function hideModal(id) {
  document.getElementById(id).classList.remove('visible');
}

function showHelp() {
  showModal('helpModal');
}

// ===== INSTRUCTIONS =====
function toggleInstructions() {
  var content = document.getElementById('instrContent');
  var toggle = document.getElementById('instrToggle');
  if (content && toggle) {
    content.classList.toggle('open');
    toggle.classList.toggle('open');
  }
}

// ===== HISTORY CARDS =====
function toggleHistory(header) {
  var body = header.nextElementSibling;
  var chevron = header.querySelector('.chevron');
  body.classList.toggle('open');
  if (chevron) chevron.classList.toggle('open');
}

// ===== TOGGLE SIDE PANEL =====
function toggleSidePanel() {
  var layout = document.getElementById('mainLayout');
  var icon = document.getElementById('togglePanelIcon');
  var indicator = document.getElementById('panelIndicator');
  layout.classList.toggle('panel-collapsed');
  var collapsed = layout.classList.contains('panel-collapsed');
  icon.innerHTML = collapsed ? '&#x25e8;' : '&#x25e8;';
  icon.style.opacity = collapsed ? '0.4' : '1';
  if (indicator) indicator.style.display = collapsed ? 'none' : 'block';
}

// ===== FULLSCREEN =====
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(function() {});
  } else {
    document.exitFullscreen().catch(function() {});
  }
}

// ===== THUMBNAILS (placeholder) =====
function toggleThumbnails() {
  // V2: thumbnail sidebar
}

// ===== CHAR COUNTERS =====
function setupCharCounters() {
  var annotationText = document.getElementById('annotationText');
  if (annotationText) {
    annotationText.addEventListener('input', function() {
      var el = document.getElementById('annotationCharCount');
      if (el) el.textContent = annotationText.value.length;
    });
  }
  var generalComment = document.getElementById('generalComment');
  if (generalComment) {
    generalComment.addEventListener('input', function() {
      var el = document.getElementById('generalCharCount');
      if (el) el.textContent = generalComment.value.length;
    });
  }
}

// ===== MOBILE DRAWER =====
function setupMobileDrawer() {
  var handle = document.getElementById('dragHandle');
  if (!handle) return;

  var drawer = document.getElementById('mobileDrawer');
  var startY = 0;
  var startTranslate = 0;

  handle.addEventListener('touchstart', function(e) {
    startY = e.touches[0].clientY;
    var transform = window.getComputedStyle(drawer).transform;
    drawer.style.transition = 'none';
  });

  handle.addEventListener('touchmove', function(e) {
    var deltaY = e.touches[0].clientY - startY;
    if (state.mobileDrawerExpanded && deltaY > 0) {
      drawer.style.transform = 'translateY(' + deltaY + 'px)';
    } else if (!state.mobileDrawerExpanded && deltaY < 0) {
      drawer.style.transform = 'translateY(calc(100% - 60px + ' + deltaY + 'px))';
    }
  });

  handle.addEventListener('touchend', function(e) {
    drawer.style.transition = 'transform .3s ease';
    var endY = e.changedTouches[0].clientY;
    var deltaY = endY - startY;
    if (Math.abs(deltaY) > 50) {
      if (deltaY < 0) expandMobileDrawer();
      else collapseMobileDrawer();
    } else {
      if (state.mobileDrawerExpanded) expandMobileDrawer();
      else collapseMobileDrawer();
    }
  });

  handle.addEventListener('click', function() {
    if (state.mobileDrawerExpanded) collapseMobileDrawer();
    else expandMobileDrawer();
  });
}

function expandMobileDrawer() {
  var drawer = document.getElementById('mobileDrawer');
  drawer.classList.remove('collapsed');
  drawer.style.transform = 'translateY(0)';
  state.mobileDrawerExpanded = true;
}

function collapseMobileDrawer() {
  var drawer = document.getElementById('mobileDrawer');
  drawer.classList.add('collapsed');
  drawer.style.transform = '';
  state.mobileDrawerExpanded = false;
}

// ===== KEYBOARD =====
function setupKeyboard() {
  document.addEventListener('keydown', function(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
    if (e.key === 'ArrowLeft') prevPage();
    if (e.key === 'ArrowRight') nextPage();
    if (e.key === '+' || e.key === '=') zoomIn();
    if (e.key === '-') zoomOut();
    if (e.key === 'Escape') {
      if (state.sigDragging) { state.sigDragging = false; return; }
      if (state.sigPlaced) { removeSigPlacement(); return; }
      if (state.annotateMode) toggleAnnotateMode();
      document.querySelectorAll('.modal-overlay.visible').forEach(function(m) { m.classList.remove('visible'); });
    }
  });

  // Ctrl+wheel zoom
  var vp = document.getElementById('viewerViewport');
  if (vp) {
    vp.addEventListener('wheel', function(e) {
      if (e.ctrlKey) {
        e.preventDefault();
        if (e.deltaY < 0) zoomIn();
        else zoomOut();
      }
    }, { passive: false });
  }
}

// ===== RESIZE =====
function setupResizeHandler() {
  var isMobile = window.innerWidth <= 768;
  window.addEventListener('resize', function() {
    var nowMobile = window.innerWidth <= 768;
    if (nowMobile !== isMobile) {
      isMobile = nowMobile;
      // Re-setup signature canvas on resize
      setupSignature();
    }
  });
}

// ===== UTILITIES =====
function escapeHtml(text) {
  var div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(d) {
  if (typeof d === 'string') d = new Date(d);
  return d.toLocaleDateString('fr-FR') + ' \\u00e0 ' + d.toLocaleTimeString('fr-FR', {hour:'2-digit',minute:'2-digit'});
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function getParticipantColor(index) {
  var colors = ['#ef4444','#3b82f6','#22c55e','#f59e0b','#8b5cf6','#ec4899','#06b6d4','#f97316','#14b8a6','#6366f1'];
  return colors[index % colors.length];
}

function getRoleLabel(role) {
  return {reviewer:'Annotateur',validator:'Validateur',approver:'Approbateur',signer:'Signataire'}[role]||role;
}

function getDecisionLabel(d) {
  return {approved:'Approuv\\u00e9',rejected:'Rejet\\u00e9',validated:'Valid\\u00e9',reviewed:'Annot\\u00e9',modification_requested:'Modification demand\\u00e9e'}[d]||d;
}

function getRejectionCategoryLabel(cat) {
  return {incomplete:'Document incomplet',incorrect:'Informations incorrectes',non_compliant:'Non conforme',missing_documents:'Documents manquants',unauthorized:'Non autoris\\u00e9',other:'Autre'}[cat]||cat;
}

// ===== DOCUMENT LOCK VERIFICATION =====
async function verifyDocumentLock() {
  var banner = document.getElementById('documentLockBanner');
  var status = document.getElementById('lockVerifyStatus');
  if (!banner || !status) return;
  if (!DATA.security.isLockedForSignature || !DATA.security.lastValidationHash) {
    banner.style.display = 'none';
    return;
  }

  try {
    // Compute current hash
    var currentHash = await computeDocumentHash(DATA.document.content + DATA.security.chainHash);
    var expectedHash = DATA.security.lastValidationHash;

    if (currentHash === expectedHash) {
      status.innerHTML = '<span class="verified">\\u2713 Int\\u00e9grit\\u00e9 v\\u00e9rifi\\u00e9e</span>';
      banner.querySelector('.lock-icon').textContent = '\\u2705';
    } else {
      banner.classList.add('error');
      banner.querySelector('.lock-icon').textContent = '\\u26a0\\ufe0f';
      banner.querySelector('.lock-content strong').textContent = 'Attention : Document modifi\\u00e9';
      banner.querySelector('.lock-content p').textContent = 'Ce document semble avoir \\u00e9t\\u00e9 modifi\\u00e9 depuis sa derni\\u00e8re validation. V\\u00e9rifiez son contenu avant de signer.';
      status.innerHTML = '<span class="failed">\\u2717 \\u00c9chec v\\u00e9rification</span>';
    }
  } catch(e) {
    console.error('Hash verification error:', e);
    banner.classList.add('warning');
    status.innerHTML = '<span class="verifying">V\\u00e9rification impossible</span>';
  }
}

async function computeDocumentHash(content) {
  // Use SubtleCrypto if available
  if (window.crypto && window.crypto.subtle) {
    var encoder = new TextEncoder();
    var data = encoder.encode(content);
    var hashBuffer = await crypto.subtle.digest('SHA-256', data);
    var hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
  }
  // Fallback: simple hash
  var hash = 0;
  for (var i = 0; i < content.length; i++) {
    var char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'fallback-' + Math.abs(hash).toString(16);
}
`;
}
