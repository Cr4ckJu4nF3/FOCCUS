import { useState } from 'react';
import Carousel from 'react-bootstrap/Carousel';
import claqueta from '../assets/claqueta.jpg';
import elementos from '../assets/elementos.jpeg';
import rodaje from '../assets/rodaje.png';


function Carruselista() {
  const [index, setIndex] = useState(0);

  const handleSelect = (selectedIndex) => {
    setIndex(selectedIndex);
  };

  return (
    <Carousel activeIndex={index} onSelect={handleSelect}>
      <Carousel.Item>
        <img src={claqueta} width="550" height="400" alt="" />
        <Carousel.Caption>
          <h3>Claqueta</h3>
          <p>Elemetos para inciar la escena</p>
        </Carousel.Caption>
      </Carousel.Item>
      <Carousel.Item>
        <img src={elementos} width="550" height="400" alt="" />
        <Carousel.Caption>
          <h3>Elemetos</h3>
          <p>Elementos para grabar.</p>
        </Carousel.Caption>
      </Carousel.Item>
      <Carousel.Item>
       <img src={rodaje} width="550" height="400" alt="" />
        <Carousel.Caption>
          <h3>Rodaje</h3>
          <p>
            Siempre es el set
          </p>
        </Carousel.Caption>
      </Carousel.Item>
    </Carousel>
  );
}

export default Carruselista;