import * as THREE from 'three';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { VRMAnimationLoaderPlugin, createVRMAnimationClip, VRMLookAtQuaternionProxy } from './vendor/three-vrm-animation.module.min.js';
const host=document.querySelector('#model-viewer'),status=document.querySelector('#model-status'),poster=document.querySelector('#model-poster');
const messages={en:['Loading 3D model…','Your browser cannot display this 3D preview. A still image is shown.'],th:['กำลังโหลดโมเดล 3D…','เบราว์เซอร์นี้แสดงพรีวิว 3D ไม่ได้ จึงแสดงภาพนิ่งแทน'],ja:['3Dモデルを読み込み中…','このブラウザーでは3D表示ができないため、静止画を表示しています。']};
let failed=false;const message=()=>status.textContent=messages[document.documentElement.lang]?.[failed?1:0]||messages.en[failed?1:0];new MutationObserver(message).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
try{
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.outputColorSpace=THREE.SRGBColorSpace;host.appendChild(renderer.domElement);renderer.domElement.setAttribute('aria-label','Drag to rotate the character and scroll to zoom');
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(32,1,.01,100);camera.position.set(0,1,3.6);
 scene.add(new THREE.HemisphereLight(0xffffff,0x858ea6,2));const light=new THREE.DirectionalLight(0xffffff,2.3);light.position.set(1,3,4);scene.add(light);
 const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.enablePan=false;controls.target.set(0,.85,0);controls.minDistance=1;controls.maxDistance=6;controls.maxPolarAngle=Math.PI*.85;controls.autoRotateSpeed=1;
 const loader=new GLTFLoader();loader.register(parser=>new VRMLoaderPlugin(parser));let mixer,action;let vrm;let reset=()=>{};let replay=()=>{};let fit=()=>{};let intro=-1,elapsed=0,animated=!matchMedia('(prefers-reduced-motion: reduce)').matches;let fullDistance=3.5,center=new THREE.Vector3(0,.8,0);const baseRotation=new THREE.Quaternion();const introRotation=new THREE.Quaternion();const axis=new THREE.Vector3(0,1,0);document.querySelector('#model-idle').setAttribute('aria-pressed',String(animated));
 loader.load('./assets/models/character.vrm',async gltf=>{vrm=gltf.userData.vrm;VRMUtils.rotateVRM0(vrm);scene.add(vrm.scene);vrm.scene.traverse(o=>{o.frustumCulled=false});
 // Relax the arms from the standard VRM T pose for presentation.
 vrm.humanoid.setNormalizedPose({leftUpperArm:{rotation:new THREE.Quaternion().setFromEuler(new THREE.Euler(0,0,1.15)).toArray()},rightUpperArm:{rotation:new THREE.Quaternion().setFromEuler(new THREE.Euler(0,0,-1.15)).toArray()}});vrm.update(0);
 const box=new THREE.Box3().setFromObject(vrm.scene),size=box.getSize(new THREE.Vector3());center=box.getCenter(new THREE.Vector3());baseRotation.copy(vrm.scene.quaternion);
 const floor=new THREE.Mesh(new THREE.CircleGeometry(size.y*.45,72),new THREE.MeshBasicMaterial({color:0x263a33,transparent:true,opacity:.5,depthWrite:false}));floor.rotation.x=-Math.PI/2;floor.position.set(center.x,box.min.y-.012,center.z);scene.add(floor);
 const ring=new THREE.Mesh(new THREE.RingGeometry(size.y*.43,size.y*.434,90),new THREE.MeshBasicMaterial({color:0xc5f56a,transparent:true,opacity:.35,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.copy(floor.position);ring.position.y+=.002;scene.add(ring);
 fit=()=>{fullDistance=Math.max(size.y,size.x/Math.max(camera.aspect,.4))/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2)))*1.16;controls.minDistance=size.y*.65;controls.maxDistance=fullDistance*2};fit();
 reset=()=>{intro=-1;vrm.scene.quaternion.copy(baseRotation);camera.position.set(center.x,center.y+.035,center.z+fullDistance);controls.target.copy(center);controls.update()};
 replay=()=>{controls.autoRotate=false;document.querySelector('#model-rotate').setAttribute('aria-pressed','false');reset();if(action){animated=true;document.querySelector('#model-idle').setAttribute('aria-pressed','true');action.reset().play();action.paused=false}};reset();poster.hidden=true;status.hidden=true;host.dataset.loaded='true';
 try{const motionLoader=new GLTFLoader();motionLoader.register(p=>new VRMAnimationLoaderPlugin(p));const motion=await motionLoader.loadAsync('./assets/models/show-full-body.vrma');
 if(vrm.lookAt){const proxy=new VRMLookAtQuaternionProxy(vrm.lookAt);proxy.name='lookAtQuaternionProxy';vrm.scene.add(proxy)}
 const clip=createVRMAnimationClip(motion.userData.vrmAnimations[0],vrm);mixer=new THREE.AnimationMixer(vrm.scene);action=mixer.clipAction(clip);action.setLoop(THREE.LoopRepeat,Infinity);action.play();action.paused=!animated;mixer.update(0);vrm.update(0);host.dataset.motion='show-full-body';
 }catch(error){status.hidden=false;status.textContent='Animation could not load. Refresh to try again.'}

 },undefined,()=>{failed=true;message();renderer.domElement.hidden=true});
 const rotate=document.querySelector('#model-rotate');rotate.addEventListener('click',()=>{controls.autoRotate=!controls.autoRotate;rotate.setAttribute('aria-pressed',String(controls.autoRotate))});document.querySelector('#model-reset').addEventListener('click',reset);
 function zoom(f){camera.position.sub(controls.target).multiplyScalar(f).clampLength(controls.minDistance,controls.maxDistance).add(controls.target);controls.update()}
 document.querySelector('#model-replay').addEventListener('click',replay);document.querySelector('#model-idle').addEventListener('click',e=>{animated=!animated;e.currentTarget.setAttribute('aria-pressed',String(animated));if(action)action.paused=!animated});controls.addEventListener('start',()=>{intro=-1;if(vrm)vrm.scene.quaternion.copy(baseRotation)});
 new ResizeObserver(()=>{const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();fit();if(vrm)reset()}).observe(host);
 let visible=true;new IntersectionObserver(es=>visible=es[0].isIntersecting).observe(host);const clock=new THREE.Clock();renderer.setAnimationLoop(()=>{const dt=Math.min(clock.getDelta(),.05);if(!visible||document.hidden)return;if(vrm){if(mixer&&animated)mixer.update(dt);vrm.update(dt)}controls.update();renderer.render(scene,camera)});
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();failed=true;poster.hidden=false;status.hidden=false;message()});
}catch(e){failed=true;message();host.dataset.loaded='fallback';document.querySelectorAll('.model-controls button').forEach(b=>b.disabled=true)}
